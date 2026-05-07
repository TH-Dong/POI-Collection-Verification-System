package com.poi.system.chat.dto;

import java.util.List;

public record ChatConversationParticipantResponse(
        Long userId,
        String username,
        String realName,
        List<String> roles,
        boolean online
) {
}
