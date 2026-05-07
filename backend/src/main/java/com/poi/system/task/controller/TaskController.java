package com.poi.system.task.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.security.CustomUserDetails;
import com.poi.system.task.dto.TaskSummaryResponse;
import com.poi.system.task.dto.TaskUpsertRequest;
import com.poi.system.task.dto.UpdateTaskStatusRequest;
import com.poi.system.task.service.TaskService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/tasks/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<TaskSummaryResponse>> listMine(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(taskService.listMyTasks(userDetails.getUser().getId()));
    }

    @PutMapping("/tasks/{taskId}/status")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<TaskSummaryResponse> updateMine(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request
    ) {
        boolean adminOverride = userDetails.getUser().getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getCode()));
        return ApiResponse.success(taskService.updateMyTaskStatus(userDetails.getUser().getId(), taskId, request, adminOverride));
    }

    @GetMapping("/admin/tasks")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<TaskSummaryResponse>> listAll() {
        return ApiResponse.success(taskService.listAllTasks());
    }

    @PostMapping("/admin/tasks")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TaskSummaryResponse> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody TaskUpsertRequest request
    ) {
        return ApiResponse.success(taskService.createAdminTask(userDetails.getUser().getId(), request));
    }

    @PutMapping("/admin/tasks/{taskId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TaskSummaryResponse> update(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskUpsertRequest request
    ) {
        return ApiResponse.success(taskService.updateAdminTask(taskId, request));
    }
}
