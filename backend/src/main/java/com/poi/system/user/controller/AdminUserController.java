package com.poi.system.user.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.user.dto.UpdateUserAdminRequest;
import com.poi.system.user.dto.UserAdminResponse;
import com.poi.system.user.service.UserAdminService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserAdminService userAdminService;

    @GetMapping
    public ApiResponse<List<UserAdminResponse>> listUsers() {
        return ApiResponse.success(userAdminService.listUsers());
    }

    @PutMapping("/{userId}")
    public ApiResponse<UserAdminResponse> updateUser(@PathVariable Long userId, @Valid @RequestBody UpdateUserAdminRequest request) {
        return ApiResponse.success(userAdminService.updateUser(userId, request));
    }
}
