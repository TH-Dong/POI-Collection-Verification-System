package com.poi.system.poi.dto;

import com.poi.system.poi.enums.PoiStatus;
import java.time.Instant;
import java.util.List;

public record PoiDetailResponse(
        Long id,
        String poiName,
        String categoryCode,
        String categoryName,
        String description,
        String coverImageObjectName,
        String coverImageUrl,
        Double longitude,
        Double latitude,
        String addressText,
        String ocrText,
        Double ocrConfidence,
        String ocrProvider,
        PoiStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant submittedAt,
        Long collectorId,
        String collectorName,
        Instant latestReviewedAt,
        String latestReviewerName,
        String latestReviewComment,
        List<String> latestIssueCodes,
        List<String> latestIssueLabels,
        Integer reviewCount,
        List<PoiReviewRecordResponse> reviewRecords
) {
}
