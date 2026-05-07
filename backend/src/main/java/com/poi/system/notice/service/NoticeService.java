package com.poi.system.notice.service;

import com.poi.system.audit.service.AuditLogService;
import com.poi.system.common.enums.UserStatus;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.notice.dto.BroadcastNoticeRequest;
import com.poi.system.notice.dto.BusinessNoticeEvent;
import com.poi.system.notice.dto.NoticeItemResponse;
import com.poi.system.notice.dto.NoticeTemplateResponse;
import com.poi.system.notice.dto.NoticeUnreadResponse;
import com.poi.system.notice.dto.UpsertNoticeTemplateRequest;
import com.poi.system.notice.entity.NoticeTemplate;
import com.poi.system.notice.entity.SysNotice;
import com.poi.system.notice.entity.SysNoticeUser;
import com.poi.system.notice.enums.NoticeReceiverScope;
import com.poi.system.notice.enums.NoticeType;
import com.poi.system.notice.repository.NoticeTemplateRepository;
import com.poi.system.notice.repository.SysNoticeRepository;
import com.poi.system.notice.repository.SysNoticeUserRepository;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeTemplateRepository noticeTemplateRepository;
    private final SysNoticeRepository sysNoticeRepository;
    private final SysNoticeUserRepository sysNoticeUserRepository;
    private final SysUserRepository sysUserRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<NoticeItemResponse> listMyNotices(Long userId) {
        return sysNoticeUserRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toUserNoticeResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoticeUnreadResponse getUnreadCount(Long userId) {
        return new NoticeUnreadResponse(sysNoticeUserRepository.countByUserIdAndReadFlagFalse(userId));
    }

    @Transactional
    public void markAsRead(Long userId, Long noticeUserId) {
        SysNoticeUser noticeUser = sysNoticeUserRepository.findById(noticeUserId)
                .orElseThrow(() -> new BusinessException("NOTICE_404", "notice not found", HttpStatus.NOT_FOUND));
        if (!noticeUser.getUser().getId().equals(userId)) {
            throw new BusinessException("PERM_403", "no permission to read notice", HttpStatus.FORBIDDEN);
        }
        noticeUser.setReadFlag(true);
        noticeUser.setReadAt(java.time.Instant.now());
        sysNoticeUserRepository.save(noticeUser);
    }

    @Transactional(readOnly = true)
    public List<NoticeItemResponse> listAllNotices() {
        return sysNoticeRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toAdminNoticeResponse)
                .toList();
    }

    @Transactional
    public NoticeItemResponse broadcast(Long adminId, BroadcastNoticeRequest request) {
        SysUser creator = loadUser(adminId);
        List<SysUser> receivers = resolveReceivers(request.receiverScope(), request.roleCodes(), request.userIds());
        if (receivers.isEmpty()) {
            throw new BusinessException("NOTICE_001", "receiver list is empty");
        }
        SysNotice notice = createNotice(
                NoticeType.BROADCAST,
                null,
                normalizeRequiredText(request.title(), "NOTICE_002", "title is required"),
                normalizeRequiredText(request.content(), "NOTICE_003", "content is required"),
                request.receiverScope(),
                request.roleCodes(),
                creator
        );
        createNoticeUsers(notice, receivers);
        auditLogService.recordOperation(adminId, "NOTICE", notice.getId(), "NOTICE_BROADCAST", "广播通知：" + notice.getTitle());
        return toAdminNoticeResponse(notice);
    }

    @Transactional(readOnly = true)
    public List<NoticeTemplateResponse> listTemplates() {
        return noticeTemplateRepository.findAll().stream()
                .map(this::toTemplateResponse)
                .toList();
    }

    @Transactional
    public NoticeTemplateResponse createTemplate(UpsertNoticeTemplateRequest request) {
        String code = normalizeTemplateCode(request.templateCode());
        if (noticeTemplateRepository.findByTemplateCode(code).isPresent()) {
            throw new BusinessException("NOTICE_004", "templateCode already exists");
        }
        NoticeTemplate template = noticeTemplateRepository.save(NoticeTemplate.builder()
                .templateCode(code)
                .name(normalizeRequiredText(request.name(), "NOTICE_005", "name is required"))
                .titleTemplate(normalizeRequiredText(request.titleTemplate(), "NOTICE_006", "titleTemplate is required"))
                .contentTemplate(normalizeRequiredText(request.contentTemplate(), "NOTICE_007", "contentTemplate is required"))
                .enabled(request.enabled() == null || request.enabled())
                .build());
        auditLogService.recordOperation(null, "NOTICE_TEMPLATE", template.getId(), "NOTICE_TEMPLATE_CREATE", "创建通知模板：" + template.getTemplateCode());
        return toTemplateResponse(template);
    }

    @Transactional
    public NoticeTemplateResponse updateTemplate(Long id, UpsertNoticeTemplateRequest request) {
        NoticeTemplate template = noticeTemplateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("NOTICE_404", "notice template not found", HttpStatus.NOT_FOUND));
        template.setTemplateCode(normalizeTemplateCode(request.templateCode()));
        template.setName(normalizeRequiredText(request.name(), "NOTICE_005", "name is required"));
        template.setTitleTemplate(normalizeRequiredText(request.titleTemplate(), "NOTICE_006", "titleTemplate is required"));
        template.setContentTemplate(normalizeRequiredText(request.contentTemplate(), "NOTICE_007", "contentTemplate is required"));
        template.setEnabled(request.enabled() == null || request.enabled());
        NoticeTemplate savedTemplate = noticeTemplateRepository.save(template);
        auditLogService.recordOperation(null, "NOTICE_TEMPLATE", savedTemplate.getId(), "NOTICE_TEMPLATE_UPDATE", "更新通知模板：" + savedTemplate.getTemplateCode());
        return toTemplateResponse(savedTemplate);
    }

    @Transactional
    public void ensureSeedTemplate(String templateCode, String name, String titleTemplate, String contentTemplate) {
        noticeTemplateRepository.findByTemplateCode(templateCode).orElseGet(() -> noticeTemplateRepository.save(NoticeTemplate.builder()
                .templateCode(templateCode)
                .name(name)
                .titleTemplate(titleTemplate)
                .contentTemplate(contentTemplate)
                .enabled(true)
                .build()));
    }

    @Transactional
    public void dispatchEvent(BusinessNoticeEvent event) {
        if (event == null || event.receiverUserIds() == null || event.receiverUserIds().isEmpty()) {
            return;
        }
        Set<Long> uniqueUserIds = new LinkedHashSet<>(event.receiverUserIds());
        List<SysUser> users = sysUserRepository.findAllById(uniqueUserIds).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .toList();
        if (users.isEmpty()) {
            return;
        }

        NoticeTemplate template = event.templateCode() == null ? null : noticeTemplateRepository.findByTemplateCode(event.templateCode()).orElse(null);
        String title = template != null && template.isEnabled()
                ? renderTemplate(template.getTitleTemplate(), event.variables())
                : renderTemplate(event.fallbackTitle(), event.variables());
        String content = template != null && template.isEnabled()
                ? renderTemplate(template.getContentTemplate(), event.variables())
                : renderTemplate(event.fallbackContent(), event.variables());
        SysNotice notice = createNotice(
                event.noticeType() == null ? NoticeType.SYSTEM : event.noticeType(),
                event.templateCode(),
                title,
                content,
                NoticeReceiverScope.USER,
                List.of(),
                event.createdByUserId() == null ? null : loadUser(event.createdByUserId())
        );
        createNoticeUsers(notice, users);
    }

    private SysUser loadUser(Long userId) {
        return sysUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
    }

    private SysNotice createNotice(
            NoticeType noticeType,
            String templateCode,
            String title,
            String content,
            NoticeReceiverScope receiverScope,
            List<String> roleCodes,
            SysUser creator
    ) {
        return sysNoticeRepository.save(SysNotice.builder()
                .noticeType(noticeType)
                .templateCode(templateCode)
                .title(title)
                .content(content)
                .receiverScope(receiverScope)
                .targetRoles(roleCodes == null || roleCodes.isEmpty() ? null : String.join(",", roleCodes))
                .createdBy(creator)
                .build());
    }

    private void createNoticeUsers(SysNotice notice, Collection<SysUser> users) {
        List<SysNoticeUser> relations = new ArrayList<>();
        for (SysUser user : users) {
            relations.add(SysNoticeUser.builder()
                    .notice(notice)
                    .user(user)
                    .readFlag(false)
                    .build());
        }
        sysNoticeUserRepository.saveAll(relations);
    }

    private List<SysUser> resolveReceivers(NoticeReceiverScope scope, List<String> roleCodes, List<Long> userIds) {
        return switch (scope) {
            case ALL -> sysUserRepository.findByStatusOrderByIdAsc(UserStatus.ACTIVE);
            case ROLE -> {
                if (roleCodes == null || roleCodes.isEmpty()) {
                    throw new BusinessException("NOTICE_008", "roleCodes is required when receiverScope is ROLE");
                }
                Set<Long> userIdSet = new LinkedHashSet<>();
                List<SysUser> users = new ArrayList<>();
                for (String roleCode : roleCodes) {
                    for (SysUser user : sysUserRepository.findByRoleCodeAndStatusOrderByIdAsc(roleCode.trim().toUpperCase(), UserStatus.ACTIVE)) {
                        if (userIdSet.add(user.getId())) {
                            users.add(user);
                        }
                    }
                }
                yield users;
            }
            case USER -> {
                if (userIds == null || userIds.isEmpty()) {
                    throw new BusinessException("NOTICE_009", "userIds is required when receiverScope is USER");
                }
                yield sysUserRepository.findAllById(userIds).stream()
                        .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                        .toList();
            }
        };
    }

    private NoticeItemResponse toUserNoticeResponse(SysNoticeUser relation) {
        SysNotice notice = relation.getNotice();
        return new NoticeItemResponse(
                relation.getId(),
                notice.getId(),
                notice.getNoticeType(),
                notice.getTemplateCode(),
                notice.getTitle(),
                notice.getContent(),
                notice.getReceiverScope(),
                splitCsv(notice.getTargetRoles()),
                relation.isReadFlag(),
                relation.getReadAt(),
                notice.getCreatedAt(),
                notice.getCreatedBy() == null ? "系统" : notice.getCreatedBy().getRealName(),
                sysNoticeUserRepository.countByNoticeId(notice.getId()),
                sysNoticeUserRepository.countByNoticeIdAndReadFlagTrue(notice.getId())
        );
    }

    private NoticeItemResponse toAdminNoticeResponse(SysNotice notice) {
        return new NoticeItemResponse(
                null,
                notice.getId(),
                notice.getNoticeType(),
                notice.getTemplateCode(),
                notice.getTitle(),
                notice.getContent(),
                notice.getReceiverScope(),
                splitCsv(notice.getTargetRoles()),
                false,
                null,
                notice.getCreatedAt(),
                notice.getCreatedBy() == null ? "系统" : notice.getCreatedBy().getRealName(),
                sysNoticeUserRepository.countByNoticeId(notice.getId()),
                sysNoticeUserRepository.countByNoticeIdAndReadFlagTrue(notice.getId())
        );
    }

    private NoticeTemplateResponse toTemplateResponse(NoticeTemplate template) {
        return new NoticeTemplateResponse(
                template.getId(),
                template.getTemplateCode(),
                template.getName(),
                template.getTitleTemplate(),
                template.getContentTemplate(),
                template.isEnabled()
        );
    }

    private String normalizeTemplateCode(String value) {
        return normalizeRequiredText(value, "NOTICE_010", "templateCode is required")
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase();
    }

    private String normalizeRequiredText(String value, String code, String message) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new BusinessException(code, message);
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String renderTemplate(String template, Map<String, String> variables) {
        String content = template == null ? "" : template;
        if (variables == null || variables.isEmpty()) {
            return content;
        }
        String rendered = content;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue() == null ? "" : entry.getValue());
        }
        return rendered;
    }

    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toList();
    }
}
