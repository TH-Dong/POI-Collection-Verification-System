package com.poi.system.dispute.dto;

import com.poi.system.dispute.enums.DisputeCommentType;
import java.time.Instant;
import java.util.List;

public record DisputeCommentResponse(
        Long id,
        String senderName,
        List<String> senderRoles,
        DisputeCommentType commentType,
        String content,
        Instant createdAt
) {
}
