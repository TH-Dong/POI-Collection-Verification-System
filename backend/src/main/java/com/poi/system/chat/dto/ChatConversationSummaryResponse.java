package com.poi.system.chat.dto;

import com.poi.system.chat.enums.ConversationType;
import java.time.Instant;
import java.util.List;

public record ChatConversationSummaryResponse(
        Long id,
        ConversationType conversationType,
        String name,
        String groupCode,
        Long poiId,
        String poiName,
        String lastMessagePreview,
        Instant lastMessageAt,
        long unreadCount,
        List<ChatConversationParticipantResponse> participants
) {
}
