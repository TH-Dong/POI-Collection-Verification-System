package com.poi.system.chat.dto;

import com.poi.system.chat.enums.MessageType;
import java.time.Instant;
import java.util.List;

public record ChatMessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String senderName,
        List<String> senderRoles,
        MessageType messageType,
        String content,
        Instant createdAt,
        boolean mine
) {
}
