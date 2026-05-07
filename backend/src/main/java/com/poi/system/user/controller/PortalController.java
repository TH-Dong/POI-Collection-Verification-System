package com.poi.system.user.controller;

import com.poi.system.auth.dto.UserSummary;
import com.poi.system.common.api.ApiResponse;
import com.poi.system.security.CustomUserDetails;
import com.poi.system.security.PermissionCodes;
import com.poi.system.user.dto.HomePlaceholderResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PortalController {

    @GetMapping("/users/me")
    public ApiResponse<UserSummary> me(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<String> roles = userDetails.getUser().getRoles().stream().map(role -> role.getCode()).toList();
        return ApiResponse.success(new UserSummary(
                userDetails.getUser().getId(),
                userDetails.getUsername(),
                userDetails.getUser().getRealName(),
                roles,
                PermissionCodes.resolve(roles).stream().toList(),
                userDetails.getUser().getWechatBoundAt() != null,
                userDetails.getUser().getWechatNickname(),
                userDetails.getUser().getWechatBoundAt()
        ));
    }

    @GetMapping("/admin/home")
    @PreAuthorize("hasAnyRole('ADMIN', 'VERIFIER')")
    public ApiResponse<HomePlaceholderResponse> adminHome(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<String> roles = userDetails.getUser().getRoles().stream().map(role -> role.getCode()).toList();
        return ApiResponse.success(new HomePlaceholderResponse(
                "后台首页",
                "阶段 6 工作台，当前重点承载任务分发、通知中心、运营配置和统计看板。",
                roles
        ));
    }

    @GetMapping("/mobile/home")
    @PreAuthorize("hasAnyRole('COLLECTOR', 'VERIFIER', 'ADMIN')")
    public ApiResponse<HomePlaceholderResponse> mobileHome(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<String> roles = userDetails.getUser().getRoles().stream().map(role -> role.getCode()).toList();
        return ApiResponse.success(new HomePlaceholderResponse(
                "移动端首页",
                "阶段 6 已接入任务中心、通知中心和待办提醒入口。",
                roles
        ));
    }
}
