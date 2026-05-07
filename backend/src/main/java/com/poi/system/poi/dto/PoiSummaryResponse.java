package com.poi.system.poi.dto;

import com.poi.system.poi.enums.PoiStatus;
import java.time.Instant;
import java.util.List;

public record PoiSummaryResponse(
        Long id,
        String poiName,
        String categoryCode,
        String categoryName,
        String description,
        String coverImageUrl,
        PoiStatus status,
        Double longitude,
        Double latitude,
        String addressText,
        Long collectorId,
        String collectorName,
        Instant updatedAt,
        Instant submittedAt,
        Instant latestReviewedAt,
        String latestReviewerName,
        String latestReviewComment,
        List<String> latestIssueCodes,
        List<String> latestIssueLabels,
        Integer reviewCount
) {
}
