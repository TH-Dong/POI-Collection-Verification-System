package com.poi.system.dispute.dto;

import com.poi.system.poi.enums.PoiReviewDecision;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ArbitrateDisputeRequest(
        @NotNull PoiReviewDecision finalDecision,
        @NotBlank String description
) {
}
