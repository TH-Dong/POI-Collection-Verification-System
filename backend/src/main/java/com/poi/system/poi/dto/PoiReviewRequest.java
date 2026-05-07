package com.poi.system.poi.dto;

import com.poi.system.poi.enums.PoiReviewDecision;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PoiReviewRequest(
        @NotNull(message = "decision is required") PoiReviewDecision decision,
        List<String> issueCodes,
        String reviewComment
) {
}
