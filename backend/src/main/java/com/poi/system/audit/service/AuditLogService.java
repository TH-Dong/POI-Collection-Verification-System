package com.poi.system.audit.service;

import com.poi.system.audit.dto.LoginLogResponse;
import com.poi.system.audit.dto.OperationLogResponse;
import com.poi.system.audit.entity.SysLoginLog;
import com.poi.system.audit.entity.SysOperationLog;
import com.poi.system.audit.repository.SysLoginLogRepository;
import com.poi.system.audit.repository.SysOperationLogRepository;
import com.poi.system.common.util.RequestIdHolder;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final SysOperationLogRepository sysOperationLogRepository;
    private final SysLoginLogRepository sysLoginLogRepository;
    private final SysUserRepository sysUserRepository;

    @Transactional
    public void recordOperation(Long operatorId, String bizType, Long bizId, String actionCode, String content) {
        SysUser operator = operatorId == null ? null : sysUserRepository.findById(operatorId).orElse(null);
        sysOperationLogRepository.save(SysOperationLog.builder()
                .operator(operator)
                .operatorName(operator == null ? "系统" : operator.getRealName())
                .bizType(normalizeText(bizType, "SYSTEM"))
                .bizId(bizId)
                .actionCode(normalizeText(actionCode, "UNKNOWN"))
                .content(normalizeText(content, "-"))
                .requestId(RequestIdHolder.get())
                .build());
    }

    @Transactional
    public void recordLogin(Long userId, String username, String loginIp, boolean success, String resultMessage) {
        SysUser user = userId == null ? null : sysUserRepository.findById(userId).orElse(null);
        sysLoginLogRepository.save(SysLoginLog.builder()
                .user(user)
                .username(normalizeText(username, "-"))
                .loginIp(normalizeText(loginIp, "-"))
                .loginResult(success ? "SUCCESS" : "FAILED")
                .resultMessage(normalizeText(resultMessage, success ? "success" : "failed"))
                .build());
    }

    @Transactional(readOnly = true)
    public List<OperationLogResponse> listOperationLogs() {
        return sysOperationLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(log -> new OperationLogResponse(
                        log.getId(),
                        log.getOperator() == null ? null : log.getOperator().getId(),
                        log.getOperatorName(),
                        log.getBizType(),
                        log.getBizId(),
                        log.getActionCode(),
                        log.getContent(),
                        log.getRequestId(),
                        log.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LoginLogResponse> listLoginLogs() {
        return sysLoginLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(log -> new LoginLogResponse(
                        log.getId(),
                        log.getUser() == null ? null : log.getUser().getId(),
                        log.getUsername(),
                        log.getLoginIp(),
                        log.getLoginResult(),
                        log.getResultMessage(),
                        log.getCreatedAt()
                ))
                .toList();
    }

    private String normalizeText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
