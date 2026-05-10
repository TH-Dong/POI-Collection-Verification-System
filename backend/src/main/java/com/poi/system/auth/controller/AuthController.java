package com.poi.system.auth.controller;

import com.poi.system.auth.dto.LoginRequest;
import com.poi.system.auth.dto.LoginResponse;
import com.poi.system.auth.dto.UpdateProfileRequest;
import com.poi.system.auth.dto.UserSummary;
import com.poi.system.auth.dto.WeChatBindRequest;
import com.poi.system.auth.dto.WeChatBindingResponse;
import com.poi.system.auth.dto.WeChatLoginRequest;
import com.poi.system.auth.service.AuthService;
import com.poi.system.common.api.ApiResponse;
import com.poi.system.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpServletRequest) {
        return ApiResponse.success(authService.login(request, httpServletRequest.getRemoteAddr()));
    }

    @PostMapping("/wechat/login")
    public ApiResponse<LoginResponse> weChatLogin(@Valid @RequestBody WeChatLoginRequest request, HttpServletRequest httpServletRequest) {
        return ApiResponse.success(authService.loginByWeChat(request, httpServletRequest.getRemoteAddr()));
    }

    @GetMapping("/me")
    public ApiResponse<UserSummary> me(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(authService.currentUser(userDetails));
    }

    @PutMapping("/profile")
    public ApiResponse<UserSummary> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.success(authService.updateProfile(userDetails, request));
    }

    @GetMapping("/wechat/binding")
    public ApiResponse<WeChatBindingResponse> weChatBinding(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(authService.getWeChatBinding(userDetails));
    }

    @PostMapping("/wechat/bind")
    public ApiResponse<WeChatBindingResponse> bindWeChat(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody WeChatBindRequest request
    ) {
        return ApiResponse.success(authService.bindWeChat(userDetails, request));
    }

    @DeleteMapping("/wechat/bind")
    public ApiResponse<WeChatBindingResponse> unbindWeChat(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(authService.unbindWeChat(userDetails));
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.success("ok");
    }
}
