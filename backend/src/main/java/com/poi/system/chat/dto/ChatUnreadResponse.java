package com.poi.system.chat.dto;

public record ChatUnreadResponse(
        long unreadCount,
        long unreadConversationCount
) {
}
