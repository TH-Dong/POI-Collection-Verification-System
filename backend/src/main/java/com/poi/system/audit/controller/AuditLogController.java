package com.poi.system.audit.controller;

import com.poi.system.audit.dto.LoginLogResponse;
import com.poi.system.audit.dto.OperationLogResponse;
import com.poi.system.audit.service.AuditLogService;
import com.poi.system.common.api.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping("/operations")
    public ApiResponse<List<OperationLogResponse>> listOperationLogs() {
        return ApiResponse.success(auditLogService.listOperationLogs());
    }

    @GetMapping("/logins")
    public ApiResponse<List<LoginLogResponse>> listLoginLogs() {
        return ApiResponse.success(auditLogService.listLoginLogs());
    }
}
