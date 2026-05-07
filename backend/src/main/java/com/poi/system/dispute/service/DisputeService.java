package com.poi.system.dispute.service;

import com.poi.system.audit.service.AuditLogService;
import com.poi.system.common.enums.RoleCode;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.notice.dto.BusinessNoticeEvent;
import com.poi.system.notice.enums.NoticeType;
import com.poi.system.notice.service.BusinessNoticePublisher;
import com.poi.system.dispute.dto.ArbitrateDisputeRequest;
import com.poi.system.dispute.dto.ArbitrationRecordResponse;
import com.poi.system.dispute.dto.CreateDisputeRequest;
import com.poi.system.dispute.dto.DisputeCommentRequest;
import com.poi.system.dispute.dto.DisputeCommentResponse;
import com.poi.system.dispute.dto.DisputeDetailResponse;
import com.poi.system.dispute.dto.DisputeEscalateRequest;
import com.poi.system.dispute.dto.DisputeSummaryResponse;
import com.poi.system.dispute.entity.PoiArbitrationRecord;
import com.poi.system.dispute.entity.PoiDispute;
import com.poi.system.dispute.entity.PoiDisputeComment;
import com.poi.system.dispute.enums.DisputeCommentType;
import com.poi.system.dispute.enums.DisputeStatus;
import com.poi.system.dispute.repository.PoiArbitrationRecordRepository;
import com.poi.system.dispute.repository.PoiDisputeCommentRepository;
import com.poi.system.dispute.repository.PoiDisputeRepository;
import com.poi.system.poi.dto.PoiDetailResponse;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.entity.PoiReviewRecord;
import com.poi.system.poi.enums.PoiReviewDecision;
import com.poi.system.poi.enums.PoiStatus;
import com.poi.system.poi.repository.PoiInfoRepository;
import com.poi.system.poi.repository.PoiReviewRecordRepository;
import com.poi.system.poi.service.PoiService;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.service.TaskService;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DisputeService {

    private final PoiDisputeRepository disputeRepository;
    private final PoiDisputeCommentRepository disputeCommentRepository;
    private final PoiArbitrationRecordRepository arbitrationRecordRepository;
    private final PoiInfoRepository poiInfoRepository;
    private final PoiReviewRecordRepository poiReviewRecordRepository;
    private final SysUserRepository userRepository;
    private final PoiService poiService;
    private final TaskService taskService;
    private final BusinessNoticePublisher businessNoticePublisher;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<DisputeSummaryResponse> listDisputes(Long userId, List<String> roles) {
        List<PoiDispute> disputes = canViewAllDisputes(roles)
                ? disputeRepository.findAllByOrderByUpdatedAtDesc()
                : disputeRepository.findByInitiatorIdOrderByUpdatedAtDesc(userId);
        return disputes.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public DisputeDetailResponse getDisputeDetail(Long userId, List<String> roles, Long disputeId) {
        PoiDispute dispute = loadDispute(disputeId);
        assertCanViewDispute(dispute, userId, roles);
        return toDetail(dispute);
    }

    @Transactional
    public DisputeDetailResponse createDispute(Long collectorId, CreateDisputeRequest request) {
        String content = normalizeRequiredText(request.content(), "DISPUTE_001", "dispute content is required");
        PoiInfo poi = poiInfoRepository.findByIdAndCollectorId(request.poiId(), collectorId)
                .orElseThrow(() -> new BusinessException("POI_404", "poi not found", HttpStatus.NOT_FOUND));

        if (poi.getStatus() != PoiStatus.REJECTED) {
            throw new BusinessException("DISPUTE_002", "only rejected poi can create dispute");
        }
        disputeRepository.findFirstByPoiIdAndStatusIn(poi.getId(), List.of(DisputeStatus.DISPUTING, DisputeStatus.ARBITRATING))
                .ifPresent(item -> {
                    throw new BusinessException("DISPUTE_003", "active dispute already exists");
                });

        SysUser initiator = loadUser(collectorId);
        PoiDispute dispute = disputeRepository.save(PoiDispute.builder()
                .poi(poi)
                .initiator(initiator)
                .status(DisputeStatus.DISPUTING)
                .content(content)
                .build());

        poi.setStatus(PoiStatus.DISPUTING);
        poiInfoRepository.save(poi);

        appendSystemComment(dispute, "采集者已发起异议，记录进入争议处理中。");
        appendUserComment(dispute, initiator, List.of(RoleCode.COLLECTOR.name()), content);
        taskService.assignDisputeTask(dispute);
        publishWorkflowNotice("DISPUTE_CREATED", "有新的争议待处理", "{{poiName}} 收到新的争议说明，请尽快查看。", List.of(), poi.getPoiName(), initiator.getId(), RoleCode.VERIFIER);
        auditLogService.recordOperation(collectorId, "DISPUTE", dispute.getId(), "DISPUTE_CREATE", "发起异议：" + poi.getPoiName());
        return toDetail(dispute);
    }

    @Transactional
    public DisputeDetailResponse addComment(Long userId, List<String> roles, Long disputeId, DisputeCommentRequest request) {
        PoiDispute dispute = loadDispute(disputeId);
        String content = normalizeRequiredText(request.content(), "DISPUTE_004", "comment content is required");
        assertCanComment(dispute, userId, roles);
        SysUser sender = loadUser(userId);
        appendUserComment(dispute, sender, roles, content);
        auditLogService.recordOperation(userId, "DISPUTE", dispute.getId(), "DISPUTE_COMMENT", "补充争议说明");
        return toDetail(dispute);
    }

    @Transactional
    public DisputeDetailResponse escalateDispute(Long userId, List<String> roles, Long disputeId, DisputeEscalateRequest request) {
        PoiDispute dispute = loadDispute(disputeId);
        if (!hasAnyRole(roles, RoleCode.VERIFIER, RoleCode.ADMIN)) {
            throw new BusinessException("PERM_403", "no permission to escalate dispute", HttpStatus.FORBIDDEN);
        }
        if (dispute.getStatus() != DisputeStatus.DISPUTING) {
            throw new BusinessException("DISPUTE_005", "dispute is not in disputing status");
        }

        SysUser operator = loadUser(userId);
        String content = normalizeOptionalText(request.content());
        if (content != null) {
            appendUserComment(dispute, operator, roles, content);
        }

        dispute.setStatus(DisputeStatus.ARBITRATING);
        dispute.setEscalatedAt(Instant.now());
        disputeRepository.save(dispute);

        PoiInfo poi = dispute.getPoi();
        poi.setStatus(PoiStatus.ARBITRATING);
        poiInfoRepository.save(poi);

        appendSystemComment(dispute, "争议单已升级至管理员最终裁定。");
        taskService.assignArbitrationTask(dispute);
        publishWorkflowNotice("DISPUTE_ESCALATED", "有新的最终裁定任务", "{{poiName}} 的争议已升级，请管理员尽快裁定。", List.of(), poi.getPoiName(), operator.getId(), RoleCode.ADMIN);
        auditLogService.recordOperation(userId, "DISPUTE", dispute.getId(), "DISPUTE_ESCALATE", "争议升级至最终裁定");
        return toDetail(dispute);
    }

    @Transactional
    public DisputeDetailResponse arbitrateDispute(Long userId, List<String> roles, Long disputeId, ArbitrateDisputeRequest request) {
        PoiDispute dispute = loadDispute(disputeId);
        if (!hasAnyRole(roles, RoleCode.ADMIN)) {
            throw new BusinessException("PERM_403", "no permission to arbitrate dispute", HttpStatus.FORBIDDEN);
        }
        if (dispute.getStatus() != DisputeStatus.ARBITRATING) {
            throw new BusinessException("DISPUTE_006", "dispute is not waiting for arbitration");
        }
        if (arbitrationRecordRepository.findByDisputeId(disputeId).isPresent()) {
            throw new BusinessException("DISPUTE_007", "arbitration already submitted");
        }

        String description = normalizeRequiredText(request.description(), "DISPUTE_008", "arbitration description is required");
        SysUser reviewer = loadUser(userId);
        PoiInfo poi = dispute.getPoi();

        PoiArbitrationRecord arbitration = arbitrationRecordRepository.save(PoiArbitrationRecord.builder()
                .poi(poi)
                .dispute(dispute)
                .reviewer(reviewer)
                .finalResult(request.finalDecision())
                .description(description)
                .reviewedAt(Instant.now())
                .build());

        PoiReviewRecord reviewRecord = PoiReviewRecord.builder()
                .poi(poi)
                .reviewer(reviewer)
                .round((int) poiReviewRecordRepository.countByPoiId(poi.getId()) + 1)
                .decision(request.finalDecision())
                .issueCodes("")
                .reviewComment(description)
                .build();
        poiReviewRecordRepository.save(reviewRecord);

        dispute.setStatus(DisputeStatus.FINALIZED);
        dispute.setFinalizedAt(arbitration.getReviewedAt());
        disputeRepository.save(dispute);

        poi.setStatus(PoiStatus.FINALIZED);
        poiInfoRepository.save(poi);

        appendSystemComment(dispute, request.finalDecision() == PoiReviewDecision.APPROVED
                ? "管理员已给出最终裁定：支持采集方，记录已最终确认。"
                : "管理员已给出最终裁定：维持驳回结论，记录已最终确认。");
        taskService.completeDisputeTasks(disputeId, TaskStatus.DECIDED);
        businessNoticePublisher.publish(new BusinessNoticeEvent(
                "ARBITRATION_FINALIZED",
                NoticeType.WORKFLOW,
                "你的争议已裁定完成",
                "{{poiName}} 已完成最终裁定，结果：{{decision}}",
                reviewer.getId(),
                List.of(dispute.getInitiator().getId()),
                Map.of(
                        "poiName", poi.getPoiName(),
                        "decision", request.finalDecision() == PoiReviewDecision.APPROVED ? "支持采集方" : "维持驳回"
                )
        ));
        auditLogService.recordOperation(userId, "DISPUTE", dispute.getId(), "DISPUTE_ARBITRATE", "最终裁定：" + request.finalDecision().name());
        return toDetail(dispute);
    }

    private PoiDispute loadDispute(Long disputeId) {
        return disputeRepository.findById(disputeId)
                .orElseThrow(() -> new BusinessException("DISPUTE_404", "dispute not found", HttpStatus.NOT_FOUND));
    }

    private SysUser loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
    }

    private void assertCanViewDispute(PoiDispute dispute, Long userId, List<String> roles) {
        if (canViewAllDisputes(roles)) {
            return;
        }
        if (hasAnyRole(roles, RoleCode.COLLECTOR) && dispute.getInitiator().getId().equals(userId)) {
            return;
        }
        throw new BusinessException("PERM_403", "no permission to access dispute", HttpStatus.FORBIDDEN);
    }

    private void assertCanComment(PoiDispute dispute, Long userId, List<String> roles) {
        if (dispute.getStatus() != DisputeStatus.DISPUTING) {
            throw new BusinessException("DISPUTE_009", "only disputing records accept comments");
        }
        if (hasAnyRole(roles, RoleCode.VERIFIER, RoleCode.ADMIN)) {
            return;
        }
        if (hasAnyRole(roles, RoleCode.COLLECTOR) && dispute.getInitiator().getId().equals(userId)) {
            return;
        }
        throw new BusinessException("PERM_403", "no permission to comment dispute", HttpStatus.FORBIDDEN);
    }

    private boolean canViewAllDisputes(List<String> roles) {
        return hasAnyRole(roles, RoleCode.VERIFIER, RoleCode.ADMIN);
    }

    private boolean hasAnyRole(List<String> roles, RoleCode... codes) {
        for (RoleCode code : codes) {
            if (roles.contains(code.name())) {
                return true;
            }
        }
        return false;
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

    private void appendSystemComment(PoiDispute dispute, String content) {
        disputeCommentRepository.save(PoiDisputeComment.builder()
                .dispute(dispute)
                .commentType(DisputeCommentType.SYSTEM)
                .senderRoles("")
                .content(content)
                .build());
    }

    private void appendUserComment(PoiDispute dispute, SysUser sender, Collection<String> roles, String content) {
        disputeCommentRepository.save(PoiDisputeComment.builder()
                .dispute(dispute)
                .sender(sender)
                .commentType(DisputeCommentType.USER)
                .senderRoles(String.join(",", roles))
                .content(content)
                .build());
    }

    private DisputeDetailResponse toDetail(PoiDispute dispute) {
        List<PoiDisputeComment> comments = disputeCommentRepository.findByDisputeIdOrderByCreatedAtAsc(dispute.getId());
        return new DisputeDetailResponse(
                toSummary(dispute),
                loadPoiDetail(dispute.getPoi().getId()),
                comments.stream().map(this::toComment).toList(),
                arbitrationRecordRepository.findByDisputeId(dispute.getId()).map(this::toArbitration).orElse(null)
        );
    }

    private PoiDetailResponse loadPoiDetail(Long poiId) {
        return poiService.getPoiDetail(poiId);
    }

    private DisputeSummaryResponse toSummary(PoiDispute dispute) {
        PoiArbitrationRecord arbitration = arbitrationRecordRepository.findByDisputeId(dispute.getId()).orElse(null);
        String latestComment = disputeCommentRepository.findByDisputeIdOrderByCreatedAtAsc(dispute.getId()).stream()
                .reduce((first, second) -> second)
                .map(PoiDisputeComment::getContent)
                .orElse(dispute.getContent());

        return new DisputeSummaryResponse(
                dispute.getId(),
                dispute.getPoi().getId(),
                dispute.getPoi().getPoiName(),
                dispute.getPoi().getStatus(),
                dispute.getStatus(),
                dispute.getInitiator().getId(),
                dispute.getInitiator().getRealName(),
                dispute.getCreatedAt(),
                dispute.getUpdatedAt(),
                dispute.getEscalatedAt(),
                dispute.getFinalizedAt(),
                arbitration == null ? null : arbitration.getFinalResult(),
                latestComment
        );
    }

    private DisputeCommentResponse toComment(PoiDisputeComment comment) {
        List<String> senderRoles = comment.getSenderRoles() == null || comment.getSenderRoles().isBlank()
                ? List.of()
                : List.of(comment.getSenderRoles().split(","));
        return new DisputeCommentResponse(
                comment.getId(),
                comment.getSender() == null ? "系统" : comment.getSender().getRealName(),
                senderRoles,
                comment.getCommentType(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }

    private ArbitrationRecordResponse toArbitration(PoiArbitrationRecord record) {
        return new ArbitrationRecordResponse(
                record.getId(),
                record.getReviewer().getRealName(),
                record.getFinalResult(),
                record.getDescription(),
                record.getReviewedAt()
        );
    }

    private void publishWorkflowNotice(String templateCode, String fallbackTitle, String fallbackContent, List<Long> receiverUserIds, String poiName, Long createdByUserId, RoleCode fallbackRoleCode) {
        List<Long> recipients = receiverUserIds.isEmpty()
                ? userRepository.findByRoleCodeAndStatusOrderByIdAsc(fallbackRoleCode.name(), com.poi.system.common.enums.UserStatus.ACTIVE).stream()
                        .map(SysUser::getId)
                        .toList()
                : receiverUserIds;
        businessNoticePublisher.publish(new BusinessNoticeEvent(
                templateCode,
                NoticeType.WORKFLOW,
                fallbackTitle,
                fallbackContent,
                createdByUserId,
                recipients,
                Map.of("poiName", poiName)
        ));
    }
}
