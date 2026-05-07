package com.poi.system.dashboard.service;

import com.poi.system.chat.repository.ImConversationMemberRepository;
import com.poi.system.audit.repository.SysLoginLogRepository;
import com.poi.system.audit.repository.SysOperationLogRepository;
import com.poi.system.dashboard.dto.AdminDashboardResponse;
import com.poi.system.dashboard.dto.MobileWorkbenchResponse;
import com.poi.system.dispute.enums.DisputeStatus;
import com.poi.system.dispute.repository.PoiDisputeRepository;
import com.poi.system.notice.repository.SysNoticeUserRepository;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.enums.PoiStatus;
import com.poi.system.poi.repository.PoiInfoRepository;
import com.poi.system.task.entity.BizTask;
import com.poi.system.task.enums.TaskPriority;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.enums.TaskType;
import com.poi.system.task.repository.BizTaskRepository;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PoiInfoRepository poiInfoRepository;
    private final PoiDisputeRepository poiDisputeRepository;
    private final BizTaskRepository bizTaskRepository;
    private final SysNoticeUserRepository sysNoticeUserRepository;
    private final SysUserRepository sysUserRepository;
    private final ImConversationMemberRepository imConversationMemberRepository;
    private final SysOperationLogRepository sysOperationLogRepository;
    private final SysLoginLogRepository sysLoginLogRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getAdminDashboard() {
        List<PoiInfo> pois = poiInfoRepository.findAll();
        List<BizTask> tasks = bizTaskRepository.findAll();
        List<SysUser> users = sysUserRepository.findAll();
        long disputeTotal = poiDisputeRepository.count();
        long disputePending = poiDisputeRepository.findAll().stream()
                .filter(item -> item.getStatus() == DisputeStatus.DISPUTING || item.getStatus() == DisputeStatus.ARBITRATING)
                .count();
        long taskPending = tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.PROCESSING || task.getStatus() == TaskStatus.OVERDUE)
                .count();
        long noticeUnread = sysNoticeUserRepository.findAll().stream().filter(item -> !item.isReadFlag()).count();

        return new AdminDashboardResponse(
                new AdminDashboardResponse.SummaryCard(
                        pois.size(),
                        pois.stream().filter(item -> item.getStatus() == PoiStatus.SUBMITTED || item.getStatus() == PoiStatus.RESUBMITTED).count(),
                        pois.stream().filter(item -> item.getStatus() == PoiStatus.APPROVED || item.getStatus() == PoiStatus.FINALIZED).count()
                ),
                new AdminDashboardResponse.SummaryCard(
                        disputeTotal,
                        disputePending,
                        Math.max(disputeTotal - disputePending, 0)
                ),
                new AdminDashboardResponse.SummaryCard(
                        tasks.size(),
                        taskPending,
                        Math.max(tasks.size() - taskPending, 0)
                ),
                new AdminDashboardResponse.SummaryCard(
                        sysNoticeUserRepository.count(),
                        noticeUnread,
                        Math.max(sysNoticeUserRepository.count() - noticeUnread, 0)
                ),
                List.of(PoiStatus.values()).stream()
                        .map(status -> new AdminDashboardResponse.MetricItem(status.name(), status.name(), pois.stream().filter(item -> item.getStatus() == status).count()))
                        .toList(),
                pois.stream()
                        .filter(item -> item.getCategoryCode() != null && !item.getCategoryCode().isBlank())
                        .collect(java.util.stream.Collectors.groupingBy(PoiInfo::getCategoryCode, java.util.LinkedHashMap::new, java.util.stream.Collectors.counting()))
                        .entrySet().stream()
                        .map(entry -> new AdminDashboardResponse.MetricItem(entry.getKey(), entry.getKey(), entry.getValue()))
                        .toList(),
                List.of(TaskType.values()).stream()
                        .map(type -> new AdminDashboardResponse.MetricItem(type.name(), type.name(), tasks.stream().filter(item -> item.getTaskType() == type).count()))
                        .toList(),
                List.of("COLLECTOR", "VERIFIER", "ADMIN").stream()
                        .map(roleCode -> new AdminDashboardResponse.MetricItem(roleCode, roleCode, users.stream()
                                .filter(user -> user.getRoles().stream().anyMatch(role -> roleCode.equals(role.getCode())))
                                .count()))
                        .toList(),
                List.of(
                        new AdminDashboardResponse.MetricItem("OCR_READY", "已沉淀 OCR 结果", pois.stream().filter(item -> item.getOcrText() != null && !item.getOcrText().isBlank()).count()),
                        new AdminDashboardResponse.MetricItem("WECHAT_BOUND", "已绑定微信账号", users.stream().filter(item -> item.getWechatBoundAt() != null).count()),
                        new AdminDashboardResponse.MetricItem("OP_AUDIT", "操作审计日志", sysOperationLogRepository.count()),
                        new AdminDashboardResponse.MetricItem("LOGIN_FAILED", "登录失败记录", sysLoginLogRepository.findAllByOrderByCreatedAtDesc().stream().filter(item -> "FAILED".equals(item.getLoginResult())).count())
                )
        );
    }

    @Transactional(readOnly = true)
    public MobileWorkbenchResponse getMobileWorkbench(Long userId, List<String> roles) {
        List<BizTask> tasks = bizTaskRepository.findByAssigneeIdOrderByUpdatedAtDesc(userId);
        long pendingTaskCount = tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.PROCESSING || task.getStatus() == TaskStatus.OVERDUE)
                .count();
        long urgentTaskCount = tasks.stream()
                .filter(task -> task.getPriority() == TaskPriority.HIGH || task.getPriority() == TaskPriority.URGENT)
                .filter(task -> task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.PROCESSING || task.getStatus() == TaskStatus.OVERDUE)
                .count();
        long unreadNoticeCount = sysNoticeUserRepository.countByUserIdAndReadFlagFalse(userId);
        long unreadChatCount = imConversationMemberRepository.sumUnreadCountByUserId(userId);
        String title = roles.contains("VERIFIER") ? "核验工作台" : "移动工作台";
        String message = roles.contains("VERIFIER")
                ? "阶段 8 已接入 OCR 辅助、微信绑定与协作留痕，可直接在移动端处理核验。"
                : "阶段 8 已接入 OCR 辅助、微信绑定与协作提醒，采集与整改可直接在线闭环。";
        return new MobileWorkbenchResponse(title, message, pendingTaskCount, urgentTaskCount, unreadNoticeCount, unreadChatCount);
    }
}
