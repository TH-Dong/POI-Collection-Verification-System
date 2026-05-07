package com.poi.system.notice.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.notice.dto.BroadcastNoticeRequest;
import com.poi.system.notice.dto.NoticeItemResponse;
import com.poi.system.notice.dto.NoticeTemplateResponse;
import com.poi.system.notice.dto.NoticeUnreadResponse;
import com.poi.system.notice.dto.UpsertNoticeTemplateRequest;
import com.poi.system.notice.service.NoticeService;
import com.poi.system.security.CustomUserDetails;
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
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping("/notices")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<NoticeItemResponse>> listMine(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(noticeService.listMyNotices(userDetails.getUser().getId()));
    }

    @GetMapping("/notices/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<NoticeUnreadResponse> unreadCount(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(noticeService.getUnreadCount(userDetails.getUser().getId()));
    }

    @PutMapping("/notices/{noticeUserId}/read")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> markRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long noticeUserId
    ) {
        noticeService.markAsRead(userDetails.getUser().getId(), noticeUserId);
        return ApiResponse.success(null);
    }

    @GetMapping("/admin/notices")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<NoticeItemResponse>> listAll() {
        return ApiResponse.success(noticeService.listAllNotices());
    }

    @PostMapping("/admin/notices/broadcast")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<NoticeItemResponse> broadcast(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody BroadcastNoticeRequest request
    ) {
        return ApiResponse.success(noticeService.broadcast(userDetails.getUser().getId(), request));
    }

    @GetMapping("/admin/notice-templates")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<NoticeTemplateResponse>> listTemplates() {
        return ApiResponse.success(noticeService.listTemplates());
    }

    @PostMapping("/admin/notice-templates")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<NoticeTemplateResponse> createTemplate(@Valid @RequestBody UpsertNoticeTemplateRequest request) {
        return ApiResponse.success(noticeService.createTemplate(request));
    }

    @PutMapping("/admin/notice-templates/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<NoticeTemplateResponse> updateTemplate(@PathVariable Long id, @Valid @RequestBody UpsertNoticeTemplateRequest request) {
        return ApiResponse.success(noticeService.updateTemplate(id, request));
    }
}
