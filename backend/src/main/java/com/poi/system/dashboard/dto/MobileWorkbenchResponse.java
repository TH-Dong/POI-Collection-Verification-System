package com.poi.system.dashboard.dto;

public record MobileWorkbenchResponse(
        String title,
        String message,
        long pendingTaskCount,
        long urgentTaskCount,
        long unreadNoticeCount,
        long unreadChatCount
) {
}
