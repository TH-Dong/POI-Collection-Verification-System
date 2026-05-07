package com.poi.system.dispute.dto;

import com.poi.system.poi.enums.PoiReviewDecision;
import java.time.Instant;

public record ArbitrationRecordResponse(
        Long id,
        String reviewerName,
        PoiReviewDecision finalDecision,
        String description,
        Instant reviewedAt
) {
}
