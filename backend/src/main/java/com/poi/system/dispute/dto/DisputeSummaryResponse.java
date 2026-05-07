package com.poi.system.dispute.dto;

import com.poi.system.dispute.enums.DisputeStatus;
import com.poi.system.poi.enums.PoiReviewDecision;
import com.poi.system.poi.enums.PoiStatus;
import java.time.Instant;

public record DisputeSummaryResponse(
        Long id,
        Long poiId,
        String poiName,
        PoiStatus poiStatus,
        DisputeStatus disputeStatus,
        Long initiatorId,
        String initiatorName,
        Instant createdAt,
        Instant updatedAt,
        Instant escalatedAt,
        Instant finalizedAt,
        PoiReviewDecision finalDecision,
        String latestComment
) {
}
