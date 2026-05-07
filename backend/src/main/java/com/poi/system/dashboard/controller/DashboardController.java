package com.poi.system.dashboard.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.dashboard.dto.AdminDashboardResponse;
import com.poi.system.dashboard.dto.MobileWorkbenchResponse;
import com.poi.system.dashboard.service.DashboardService;
import com.poi.system.security.CustomUserDetails;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'VERIFIER')")
    public ApiResponse<AdminDashboardResponse> adminDashboard() {
        return ApiResponse.success(dashboardService.getAdminDashboard());
    }

    @GetMapping("/mobile/workbench")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MobileWorkbenchResponse> mobileWorkbench(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<String> roles = userDetails.getUser().getRoles().stream().map(role -> role.getCode()).toList();
        return ApiResponse.success(dashboardService.getMobileWorkbench(userDetails.getUser().getId(), roles));
    }
}
