package com.poi.system.task.service;

import com.poi.system.audit.service.AuditLogService;
import com.poi.system.common.enums.RoleCode;
import com.poi.system.common.enums.UserStatus;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.dispute.entity.PoiDispute;
import com.poi.system.notice.dto.BusinessNoticeEvent;
import com.poi.system.notice.enums.NoticeType;
import com.poi.system.notice.service.BusinessNoticePublisher;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.rule.service.WorkflowRuleService;
import com.poi.system.task.dto.TaskSummaryResponse;
import com.poi.system.task.dto.TaskUpsertRequest;
import com.poi.system.task.dto.UpdateTaskStatusRequest;
import com.poi.system.task.entity.BizTask;
import com.poi.system.task.enums.TaskPriority;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.enums.TaskType;
import com.poi.system.task.repository.BizTaskRepository;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.time.Instant;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final Collection<TaskStatus> OPEN_STATUSES = EnumSet.of(TaskStatus.PENDING, TaskStatus.PROCESSING, TaskStatus.OVERDUE);

    private final BizTaskRepository bizTaskRepository;
    private final SysUserRepository sysUserRepository;
    private final WorkflowRuleService workflowRuleService;
    private final BusinessNoticePublisher businessNoticePublisher;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<TaskSummaryResponse> listMyTasks(Long userId) {
        return bizTaskRepository.findByAssigneeIdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskSummaryResponse> listAllTasks() {
        return bizTaskRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TaskSummaryResponse createAdminTask(Long adminId, TaskUpsertRequest request) {
        SysUser creator = loadUser(adminId);
        SysUser assignee = request.assigneeId() == null ? null : loadActiveUser(request.assigneeId());
        validateTaskRole(request.taskType(), assignee);
        BizTask task = bizTaskRepository.save(BizTask.builder()
                .taskType(request.taskType())
                .bizType(normalizeRequiredText(request.bizType(), "TASK_001", "bizType is required").toUpperCase())
                .bizId(request.bizId())
                .title(normalizeRequiredText(request.title(), "TASK_002", "title is required"))
                .description(normalizeOptionalText(request.description()))
                .assignee(assignee)
                .createdBy(creator)
                .status(request.status() == null ? TaskStatus.PENDING : request.status())
                .priority(request.priority() == null ? TaskPriority.MEDIUM : request.priority())
                .dueAt(request.dueAt())
                .sourceEvent("task.assigned")
                .build());
        publishAssignmentNotice(task);
        auditLogService.recordOperation(adminId, "TASK", task.getId(), "TASK_CREATE", "创建任务：" + task.getTitle());
        return toResponse(task);
    }

    @Transactional
    public TaskSummaryResponse updateAdminTask(Long taskId, TaskUpsertRequest request) {
        BizTask task = loadTask(taskId);
        SysUser assignee = request.assigneeId() == null ? null : loadActiveUser(request.assigneeId());
        validateTaskRole(request.taskType(), assignee);
        task.setTaskType(request.taskType());
        task.setBizType(normalizeRequiredText(request.bizType(), "TASK_001", "bizType is required").toUpperCase());
        task.setBizId(request.bizId());
        task.setTitle(normalizeRequiredText(request.title(), "TASK_002", "title is required"));
        task.setDescription(normalizeOptionalText(request.description()));
        task.setAssignee(assignee);
        task.setPriority(request.priority() == null ? TaskPriority.MEDIUM : request.priority());
        task.setStatus(request.status() == null ? task.getStatus() : request.status());
        task.setDueAt(request.dueAt());
        BizTask savedTask = bizTaskRepository.save(task);
        publishAssignmentNotice(savedTask);
        auditLogService.recordOperation(savedTask.getCreatedBy() == null ? null : savedTask.getCreatedBy().getId(), "TASK", savedTask.getId(), "TASK_UPDATE", "更新任务：" + savedTask.getTitle());
        return toResponse(savedTask);
    }

    @Transactional
    public TaskSummaryResponse updateMyTaskStatus(Long userId, Long taskId, UpdateTaskStatusRequest request, boolean adminOverride) {
        BizTask task = loadTask(taskId);
        if (!adminOverride && (task.getAssignee() == null || !task.getAssignee().getId().equals(userId))) {
            throw new BusinessException("PERM_403", "no permission to operate task", HttpStatus.FORBIDDEN);
        }
        task.setStatus(request.status());
        if (request.status() == TaskStatus.PROCESSING && task.getStartedAt() == null) {
            task.setStartedAt(Instant.now());
        }
        if (isTerminalStatus(request.status())) {
            task.setCompletedAt(Instant.now());
        }
        BizTask savedTask = bizTaskRepository.save(task);
        auditLogService.recordOperation(userId, "TASK", savedTask.getId(), "TASK_STATUS_UPDATE", "任务状态更新为：" + request.status().name());
        return toResponse(savedTask);
    }

    @Transactional
    public void assignVerifyTaskForPoi(PoiInfo poi) {
        closeTasksByBiz("POI", poi.getId());
        SysUser assignee = resolveDefaultAssignee(RoleCode.VERIFIER, workflowRuleService.getBooleanValue(WorkflowRuleService.TASK_AUTO_ASSIGN_ENABLED, true));
        BizTask task = bizTaskRepository.save(BizTask.builder()
                .taskType(TaskType.VERIFY)
                .bizType("POI")
                .bizId(poi.getId())
                .title(poi.getStatus().name().equals("RESUBMITTED") ? "整改复核任务" : "新核验任务")
                .description(poi.getPoiName() + " 已进入核验队列，请尽快处理。")
                .assignee(assignee)
                .status(TaskStatus.PENDING)
                .priority(poi.getStatus().name().equals("RESUBMITTED") ? TaskPriority.HIGH : TaskPriority.MEDIUM)
                .dueAt(Instant.now().plusSeconds(3600L * workflowRuleService.getIntValue(WorkflowRuleService.VERIFY_TASK_DUE_HOURS, 24)))
                .sourceEvent(poi.getStatus().name().equals("RESUBMITTED") ? "poi.resubmitted" : "poi.submitted")
                .build());
        publishAssignmentNotice(task);
    }

    @Transactional
    public void completePoiTasks(Long poiId, TaskStatus status) {
        for (BizTask task : bizTaskRepository.findByBizTypeAndBizIdAndStatusIn("POI", poiId, OPEN_STATUSES)) {
            task.setStatus(status);
            task.setCompletedAt(Instant.now());
            bizTaskRepository.save(task);
        }
    }

    @Transactional
    public void assignDisputeTask(PoiDispute dispute) {
        closeTasksByBiz("DISPUTE", dispute.getId());
        SysUser assignee = resolveDefaultAssignee(RoleCode.VERIFIER, workflowRuleService.getBooleanValue(WorkflowRuleService.TASK_AUTO_ASSIGN_ENABLED, true));
        BizTask task = bizTaskRepository.save(BizTask.builder()
                .taskType(TaskType.DISPUTE)
                .bizType("DISPUTE")
                .bizId(dispute.getId())
                .title("争议处理任务")
                .description(dispute.getPoi().getPoiName() + " 收到新的争议说明，请核验者继续处理。")
                .assignee(assignee)
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.HIGH)
                .dueAt(Instant.now().plusSeconds(3600L * workflowRuleService.getIntValue(WorkflowRuleService.DISPUTE_TASK_DUE_HOURS, 12)))
                .sourceEvent("dispute.created")
                .build());
        publishAssignmentNotice(task);
    }

    @Transactional
    public void assignArbitrationTask(PoiDispute dispute) {
        closeTasksByBiz("DISPUTE", dispute.getId());
        SysUser assignee = resolveDefaultAssignee(RoleCode.ADMIN, true);
        BizTask task = bizTaskRepository.save(BizTask.builder()
                .taskType(TaskType.ARBITRATION)
                .bizType("DISPUTE")
                .bizId(dispute.getId())
                .title("最终裁定任务")
                .description(dispute.getPoi().getPoiName() + " 争议已升级，请管理员给出最终结论。")
                .assignee(assignee)
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.URGENT)
                .dueAt(Instant.now().plusSeconds(3600L * workflowRuleService.getIntValue(WorkflowRuleService.ARBITRATION_TASK_DUE_HOURS, 8)))
                .sourceEvent("dispute.escalated")
                .build());
        publishAssignmentNotice(task);
    }

    @Transactional
    public void completeDisputeTasks(Long disputeId, TaskStatus status) {
        for (BizTask task : bizTaskRepository.findByBizTypeAndBizIdAndStatusIn("DISPUTE", disputeId, OPEN_STATUSES)) {
            task.setStatus(status);
            task.setCompletedAt(Instant.now());
            bizTaskRepository.save(task);
        }
    }

    private void closeTasksByBiz(String bizType, Long bizId) {
        for (BizTask task : bizTaskRepository.findByBizTypeAndBizIdAndStatusIn(bizType, bizId, OPEN_STATUSES)) {
            task.setStatus(TaskStatus.CLOSED);
            task.setCompletedAt(Instant.now());
            bizTaskRepository.save(task);
        }
    }

    private SysUser resolveDefaultAssignee(RoleCode roleCode, boolean autoAssignEnabled) {
        if (!autoAssignEnabled) {
            return null;
        }
        return sysUserRepository.findByRoleCodeAndStatusOrderByIdAsc(roleCode.name(), UserStatus.ACTIVE).stream()
                .findFirst()
                .orElse(null);
    }

    private void publishAssignmentNotice(BizTask task) {
        if (task.getAssignee() == null) {
            return;
        }
        businessNoticePublisher.publish(new BusinessNoticeEvent(
                "TASK_ASSIGNED",
                NoticeType.TASK,
                "你有新的任务待处理",
                "{{title}}，截止时间：{{dueAt}}。",
                task.getCreatedBy() == null ? null : task.getCreatedBy().getId(),
                List.of(task.getAssignee().getId()),
                Map.of(
                        "title", task.getTitle(),
                        "dueAt", task.getDueAt() == null ? "未设置" : task.getDueAt().toString()
                )
        ));
    }

    private BizTask loadTask(Long taskId) {
        return bizTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("TASK_404", "task not found", HttpStatus.NOT_FOUND));
    }

    private SysUser loadUser(Long userId) {
        return sysUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
    }

    private SysUser loadActiveUser(Long userId) {
        SysUser user = loadUser(userId);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("TASK_003", "assignee must be active");
        }
        return user;
    }

    private void validateTaskRole(TaskType taskType, SysUser assignee) {
        if (assignee == null) {
            return;
        }
        List<String> roles = assignee.getRoles().stream().map(role -> role.getCode()).toList();
        switch (taskType) {
            case COLLECTION -> {
                if (!roles.contains(RoleCode.COLLECTOR.name())) {
                    throw new BusinessException("TASK_004", "collection task must assign to collector");
                }
            }
            case VERIFY, DISPUTE -> {
                if (!roles.contains(RoleCode.VERIFIER.name()) && !roles.contains(RoleCode.ADMIN.name())) {
                    throw new BusinessException("TASK_005", "verification task must assign to verifier or admin");
                }
            }
            case ARBITRATION -> {
                if (!roles.contains(RoleCode.ADMIN.name())) {
                    throw new BusinessException("TASK_006", "arbitration task must assign to admin");
                }
            }
        }
    }

    private boolean isTerminalStatus(TaskStatus status) {
        return status == TaskStatus.CLOSED
                || status == TaskStatus.SUBMITTED
                || status == TaskStatus.APPROVED
                || status == TaskStatus.REJECTED
                || status == TaskStatus.DECIDED;
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

    private TaskSummaryResponse toResponse(BizTask task) {
        Instant now = Instant.now();
        return new TaskSummaryResponse(
                task.getId(),
                task.getTaskType(),
                task.getBizType(),
                task.getBizId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getPriority(),
                task.getAssignee() == null ? null : task.getAssignee().getId(),
                task.getAssignee() == null ? null : task.getAssignee().getRealName(),
                task.getAssignee() == null ? List.of() : task.getAssignee().getRoles().stream().map(role -> role.getCode()).toList(),
                task.getCreatedBy() == null ? null : task.getCreatedBy().getId(),
                task.getCreatedBy() == null ? null : task.getCreatedBy().getRealName(),
                task.getSourceEvent(),
                task.getDueAt(),
                task.getStartedAt(),
                task.getCompletedAt(),
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getDueAt() != null && task.getDueAt().isBefore(now) && !isTerminalStatus(task.getStatus())
        );
    }
}
