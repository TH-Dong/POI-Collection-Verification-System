package com.poi.system.chat.service;

import com.poi.system.audit.service.AuditLogService;
import com.poi.system.chat.dto.ChatConversationDetailResponse;
import com.poi.system.chat.dto.ChatConversationParticipantResponse;
import com.poi.system.chat.dto.ChatConversationSummaryResponse;
import com.poi.system.chat.dto.ChatMessageResponse;
import com.poi.system.chat.dto.ChatUnreadResponse;
import com.poi.system.chat.entity.ImConversation;
import com.poi.system.chat.entity.ImConversationMember;
import com.poi.system.chat.entity.ImMessage;
import com.poi.system.chat.enums.ConversationGroupCode;
import com.poi.system.chat.enums.ConversationType;
import com.poi.system.chat.enums.MessageType;
import com.poi.system.chat.realtime.ChatRealtimeService;
import com.poi.system.chat.repository.ImConversationMemberRepository;
import com.poi.system.chat.repository.ImConversationRepository;
import com.poi.system.chat.repository.ImMessageRepository;
import com.poi.system.common.enums.RoleCode;
import com.poi.system.common.enums.UserStatus;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.notice.dto.BusinessNoticeEvent;
import com.poi.system.notice.enums.NoticeType;
import com.poi.system.notice.service.BusinessNoticePublisher;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.entity.PoiReviewRecord;
import com.poi.system.poi.repository.PoiInfoRepository;
import com.poi.system.poi.repository.PoiReviewRecordRepository;
import com.poi.system.task.entity.BizTask;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.repository.BizTaskRepository;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
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
public class ChatService {

    private static final Collection<TaskStatus> OPEN_TASK_STATUSES = EnumSet.of(TaskStatus.PENDING, TaskStatus.PROCESSING, TaskStatus.OVERDUE);

    private final ImConversationRepository imConversationRepository;
    private final ImConversationMemberRepository imConversationMemberRepository;
    private final ImMessageRepository imMessageRepository;
    private final SysUserRepository sysUserRepository;
    private final PoiInfoRepository poiInfoRepository;
    private final PoiReviewRecordRepository poiReviewRecordRepository;
    private final BizTaskRepository bizTaskRepository;
    private final BusinessNoticePublisher businessNoticePublisher;
    private final ChatRealtimeService chatRealtimeService;
    private final AuditLogService auditLogService;

    @Transactional
    public List<ChatConversationSummaryResponse> listConversations(Long userId, List<String> roles) {
        ensureDefaultRoleGroups(loadUser(userId), roles);
        List<ImConversation> conversations = hasAdminRole(roles)
                ? imConversationRepository.findAll()
                : imConversationRepository.findAllByMemberUserId(userId);
        Map<Long, ImConversationMember> myMemberships = toMemberMap(imConversationMemberRepository.findByUserId(userId));
        return conversations.stream()
                .sorted(Comparator.comparing(this::conversationSortTime).reversed().thenComparing(ImConversation::getId, Comparator.reverseOrder()))
                .map(conversation -> toConversationSummary(conversation, myMemberships.get(conversation.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatConversationDetailResponse getConversationDetail(Long userId, List<String> roles, Long conversationId) {
        ImConversation conversation = loadConversation(conversationId);
        assertCanViewConversation(conversation, userId, roles);
        ImConversationMember membership = imConversationMemberRepository.findByConversationIdAndUserId(conversationId, userId).orElse(null);
        List<ChatMessageResponse> messages = imMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                .map(message -> toMessageResponse(message, userId))
                .toList();
        return new ChatConversationDetailResponse(toConversationSummary(conversation, membership), messages);
    }

    @Transactional
    public ChatConversationSummaryResponse openPoiPrivateConversation(Long userId, List<String> roles, Long poiId) {
        SysUser currentUser = loadUser(userId);
        PoiInfo poi = loadAccessiblePoi(poiId, userId, roles);
        SysUser targetUser = resolvePoiConversationTarget(poi, currentUser, roles);
        if (targetUser.getId().equals(currentUser.getId())) {
            throw new BusinessException("CHAT_001", "conversation target is invalid");
        }
        ImConversation conversation = imConversationRepository.findByPrivateKey(buildPoiPrivateKey(poi.getId(), currentUser.getId(), targetUser.getId()))
                .orElseGet(() -> {
                    ImConversation created = imConversationRepository.save(ImConversation.builder()
                            .conversationType(ConversationType.PRIVATE)
                            .name(poi.getPoiName() + " 协作私聊")
                            .privateKey(buildPoiPrivateKey(poi.getId(), currentUser.getId(), targetUser.getId()))
                            .poi(poi)
                            .createdBy(currentUser)
                            .build());
                    ensureMembership(created, currentUser);
                    ensureMembership(created, targetUser);
                    appendSystemMessage(created, currentUser.getRealName() + " 发起了与 " + targetUser.getRealName() + " 的点位协作会话。");
                    return created;
                });
        ensureMembership(conversation, currentUser);
        ensureMembership(conversation, targetUser);
        return toConversationSummary(conversation, imConversationMemberRepository.findByConversationIdAndUserId(conversation.getId(), userId).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> listPoiCommunicationMessages(Long userId, List<String> roles, Long poiId) {
        loadAccessiblePoi(poiId, userId, roles);
        List<ChatMessageResponse> responses = new ArrayList<>();
        for (ImConversation conversation : imConversationRepository.findByPoiIdOrderByUpdatedAtDesc(poiId)) {
            if (!hasAdminRole(roles) && !imConversationMemberRepository.existsByConversationIdAndUserId(conversation.getId(), userId)) {
                continue;
            }
            responses.addAll(imMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
                    .map(message -> toMessageResponse(message, userId))
                    .toList());
        }
        responses.sort(Comparator.comparing(ChatMessageResponse::createdAt));
        return responses;
    }

    @Transactional
    public ChatUnreadResponse getUnreadSummary(Long userId, List<String> roles) {
        ensureDefaultRoleGroups(loadUser(userId), roles);
        return new ChatUnreadResponse(
                imConversationMemberRepository.sumUnreadCountByUserId(userId),
                imConversationMemberRepository.countByUserIdAndUnreadCountGreaterThan(userId, 0)
        );
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long userId, List<String> roles, Long conversationId, String rawContent) {
        ImConversation conversation = loadConversation(conversationId);
        String content = normalizeRequiredText(rawContent, "CHAT_002", "message content is required");
        SysUser sender = loadUser(userId);
        ImConversationMember senderMember = ensureSenderAccess(conversation, sender, roles);

        ImMessage savedMessage = imMessageRepository.save(ImMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .messageType(MessageType.TEXT)
                .content(content)
                .build());

        conversation.setLastMessagePreview(buildPreview(content));
        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        imConversationRepository.save(conversation);

        if (senderMember != null) {
            senderMember.setUnreadCount(0);
            senderMember.setLastReadAt(savedMessage.getCreatedAt());
            imConversationMemberRepository.save(senderMember);
        }

        List<ImConversationMember> members = imConversationMemberRepository.findByConversationId(conversationId);
        ChatMessageResponse senderMessageResponse = toMessageResponse(savedMessage, userId);
        Set<Long> receiverIds = new LinkedHashSet<>();
        for (ImConversationMember member : members) {
            if (member.getUser().getId().equals(userId)) {
                continue;
            }
            member.setUnreadCount(member.getUnreadCount() + 1);
            imConversationMemberRepository.save(member);
            receiverIds.add(member.getUser().getId());
            chatRealtimeService.pushConversationEvent(
                    member.getUser().getId(),
                    toConversationSummary(conversation, member),
                    toMessageResponse(savedMessage, member.getUser().getId()),
                    imConversationMemberRepository.sumUnreadCountByUserId(member.getUser().getId())
            );
        }
        chatRealtimeService.pushConversationEvent(
                userId,
                toConversationSummary(conversation, senderMember),
                senderMessageResponse,
                imConversationMemberRepository.sumUnreadCountByUserId(userId)
        );
        publishChatNotice(sender, conversation, receiverIds, content);
        auditLogService.recordOperation(userId, "CHAT", conversationId, "CHAT_SEND", "发送协作消息到会话：" + conversation.getName());
        return senderMessageResponse;
    }

    @Transactional
    public void markConversationRead(Long userId, List<String> roles, Long conversationId) {
        ImConversation conversation = loadConversation(conversationId);
        assertCanViewConversation(conversation, userId, roles);
        imConversationMemberRepository.findByConversationIdAndUserId(conversationId, userId).ifPresent(member -> {
            member.setUnreadCount(0);
            member.setLastReadAt(Instant.now());
            imConversationMemberRepository.save(member);
        });
        chatRealtimeService.pushReadEvent(userId, conversationId, imConversationMemberRepository.sumUnreadCountByUserId(userId));
    }

    @Transactional
    public void ensureSeedDefaults(List<SysUser> users) {
        ensureGroupConversation(ConversationGroupCode.COLLECTOR_GROUP, null);
        ensureGroupConversation(ConversationGroupCode.VERIFIER_GROUP, null);
        for (SysUser user : users) {
            ensureDefaultRoleGroups(user, user.getRoles().stream().map(role -> role.getCode()).toList());
        }
    }

    private void publishChatNotice(SysUser sender, ImConversation conversation, Collection<Long> receiverIds, String content) {
        if (receiverIds.isEmpty()) {
            return;
        }
        businessNoticePublisher.publish(new BusinessNoticeEvent(
                "CHAT_MESSAGE",
                NoticeType.CHAT,
                "你收到一条新的协作消息",
                "{{sender}} 在 {{conversationName}} 中发送了新消息：{{preview}}",
                sender.getId(),
                List.copyOf(receiverIds),
                Map.of(
                        "sender", sender.getRealName(),
                        "conversationName", conversation.getName(),
                        "preview", buildPreview(content)
                )
        ));
    }

    private void ensureDefaultRoleGroups(SysUser user, List<String> roles) {
        if (roles.contains(RoleCode.COLLECTOR.name())) {
            ensureMembership(ensureGroupConversation(ConversationGroupCode.COLLECTOR_GROUP, user), user);
        }
        if (roles.contains(RoleCode.VERIFIER.name())) {
            ensureMembership(ensureGroupConversation(ConversationGroupCode.VERIFIER_GROUP, user), user);
        }
    }

    private ImConversation ensureGroupConversation(ConversationGroupCode groupCode, SysUser creator) {
        return imConversationRepository.findByGroupCode(groupCode.name()).orElseGet(() -> {
            ImConversation created = imConversationRepository.save(ImConversation.builder()
                    .conversationType(ConversationType.GROUP)
                    .name(groupCode.getDefaultName())
                    .groupCode(groupCode.name())
                    .createdBy(creator)
                    .build());
            appendSystemMessage(created, groupCode.getDefaultName() + " 已启用。");
            return created;
        });
    }

    private void appendSystemMessage(ImConversation conversation, String content) {
        ImMessage message = imMessageRepository.save(ImMessage.builder()
                .conversation(conversation)
                .messageType(MessageType.SYSTEM)
                .content(content)
                .build());
        conversation.setLastMessagePreview(buildPreview(content));
        conversation.setLastMessageAt(message.getCreatedAt());
        imConversationRepository.save(conversation);
    }

    private ImConversationMember ensureSenderAccess(ImConversation conversation, SysUser sender, List<String> roles) {
        ImConversationMember member = imConversationMemberRepository.findByConversationIdAndUserId(conversation.getId(), sender.getId()).orElse(null);
        if (member != null) {
            return member;
        }
        if (!hasAdminRole(roles)) {
            throw new BusinessException("PERM_403", "no permission to send message", HttpStatus.FORBIDDEN);
        }
        return ensureMembership(conversation, sender);
    }

    private void assertCanViewConversation(ImConversation conversation, Long userId, List<String> roles) {
        if (hasAdminRole(roles) || imConversationMemberRepository.existsByConversationIdAndUserId(conversation.getId(), userId)) {
            return;
        }
        throw new BusinessException("PERM_403", "no permission to access conversation", HttpStatus.FORBIDDEN);
    }

    private SysUser resolvePoiConversationTarget(PoiInfo poi, SysUser currentUser, List<String> roles) {
        if (roles.contains(RoleCode.VERIFIER.name())) {
            return poi.getCollector();
        }
        if (!roles.contains(RoleCode.COLLECTOR.name()) || !poi.getCollector().getId().equals(currentUser.getId())) {
            throw new BusinessException("PERM_403", "no permission to create poi conversation", HttpStatus.FORBIDDEN);
        }
        for (BizTask task : bizTaskRepository.findByBizTypeAndBizIdAndStatusIn("POI", poi.getId(), OPEN_TASK_STATUSES)) {
            if (task.getAssignee() != null) {
                return task.getAssignee();
            }
        }
        PoiReviewRecord latestReview = poiReviewRecordRepository.findFirstByPoiIdOrderByCreatedAtDesc(poi.getId()).orElse(null);
        if (latestReview != null && latestReview.getReviewer() != null) {
            return latestReview.getReviewer();
        }
        return sysUserRepository.findByRoleCodeAndStatusOrderByIdAsc(RoleCode.VERIFIER.name(), UserStatus.ACTIVE).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("CHAT_003", "no active verifier available"));
    }

    private PoiInfo loadAccessiblePoi(Long poiId, Long userId, List<String> roles) {
        PoiInfo poi = poiInfoRepository.findById(poiId)
                .orElseThrow(() -> new BusinessException("POI_404", "poi not found", HttpStatus.NOT_FOUND));
        if (hasAdminRole(roles) || roles.contains(RoleCode.VERIFIER.name())) {
            return poi;
        }
        if (roles.contains(RoleCode.COLLECTOR.name()) && poi.getCollector().getId().equals(userId)) {
            return poi;
        }
        throw new BusinessException("PERM_403", "no permission to access poi conversation", HttpStatus.FORBIDDEN);
    }

    private ChatConversationSummaryResponse toConversationSummary(ImConversation conversation, ImConversationMember currentMember) {
        List<ImConversationMember> members = imConversationMemberRepository.findByConversationId(conversation.getId());
        return new ChatConversationSummaryResponse(
                conversation.getId(),
                conversation.getConversationType(),
                conversation.getName(),
                conversation.getGroupCode(),
                conversation.getPoi() == null ? null : conversation.getPoi().getId(),
                conversation.getPoi() == null ? null : conversation.getPoi().getPoiName(),
                conversation.getLastMessagePreview(),
                conversation.getLastMessageAt(),
                currentMember == null ? 0 : currentMember.getUnreadCount(),
                members.stream()
                        .map(member -> new ChatConversationParticipantResponse(
                                member.getUser().getId(),
                                member.getUser().getUsername(),
                                member.getUser().getRealName(),
                                resolveDisplayName(member.getUser()),
                                member.getUser().getAvatarUrl(),
                                member.getUser().getRoles().stream().map(role -> role.getCode()).toList(),
                                chatRealtimeService.isOnline(member.getUser().getId())
                        ))
                        .toList()
        );
    }

    private ChatMessageResponse toMessageResponse(ImMessage message, Long currentUserId) {
        List<String> senderRoles = message.getSender() == null
                ? List.of()
                : message.getSender().getRoles().stream().map(role -> role.getCode()).toList();
        return new ChatMessageResponse(
                message.getId(),
                message.getConversation().getId(),
                message.getSender() == null ? null : message.getSender().getId(),
                message.getSender() == null ? "系统" : resolveDisplayName(message.getSender()),
                message.getSender() == null ? null : message.getSender().getAvatarUrl(),
                senderRoles,
                message.getMessageType(),
                message.getContent(),
                message.getCreatedAt(),
                message.getSender() != null && message.getSender().getId().equals(currentUserId)
        );
    }

    private Map<Long, ImConversationMember> toMemberMap(List<ImConversationMember> memberships) {
        Map<Long, ImConversationMember> result = new HashMap<>();
        for (ImConversationMember membership : memberships) {
            result.put(membership.getConversation().getId(), membership);
        }
        return result;
    }

    private String buildPoiPrivateKey(Long poiId, Long userIdA, Long userIdB) {
        long min = Math.min(userIdA, userIdB);
        long max = Math.max(userIdA, userIdB);
        return "POI:" + poiId + ":" + min + ":" + max;
    }

    private String buildPreview(String content) {
        return content.length() <= 80 ? content : content.substring(0, 80);
    }

    private Instant conversationSortTime(ImConversation conversation) {
        return conversation.getLastMessageAt() == null ? conversation.getUpdatedAt() : conversation.getLastMessageAt();
    }

    private ImConversationMember ensureMembership(ImConversation conversation, SysUser user) {
        return imConversationMemberRepository.findByConversationIdAndUserId(conversation.getId(), user.getId())
                .orElseGet(() -> imConversationMemberRepository.save(ImConversationMember.builder()
                        .conversation(conversation)
                        .user(user)
                        .unreadCount(0)
                        .lastReadAt(Instant.now())
                        .build()));
    }

    private ImConversation loadConversation(Long conversationId) {
        return imConversationRepository.findById(conversationId)
                .orElseThrow(() -> new BusinessException("CHAT_404", "conversation not found", HttpStatus.NOT_FOUND));
    }

    private SysUser loadUser(Long userId) {
        return sysUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
    }

    private boolean hasAdminRole(List<String> roles) {
        return roles.contains(RoleCode.ADMIN.name());
    }

    private String resolveDisplayName(SysUser user) {
        String displayName = user.getDisplayName();
        if (displayName == null || displayName.isBlank()) {
            return user.getRealName();
        }
        return displayName;
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
}
