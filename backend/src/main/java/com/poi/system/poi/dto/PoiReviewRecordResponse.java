package com.poi.system.poi.dto;

import com.poi.system.poi.enums.PoiReviewDecision;
import java.time.Instant;
import java.util.List;

public record PoiReviewRecordResponse(
        Long id,
        Integer round,
        PoiReviewDecision decision,
        String reviewerName,
        List<String> issueCodes,
        List<String> issueLabels,
        String reviewComment,
        Instant createdAt
) {
}
