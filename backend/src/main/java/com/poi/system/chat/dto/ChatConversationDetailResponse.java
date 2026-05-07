package com.poi.system.chat.dto;

import java.util.List;

public record ChatConversationDetailResponse(
        ChatConversationSummaryResponse summary,
        List<ChatMessageResponse> messages
) {
}
