package com.poi.system.chat.dto;

import java.util.List;

public record ChatConversationParticipantResponse(
        Long userId,
        String username,
        String realName,
        String displayName,
        String avatarUrl,
        List<String> roles,
        boolean online
) {
}
