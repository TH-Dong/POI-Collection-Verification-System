package com.poi.system.dispute.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDisputeRequest(
        @NotNull Long poiId,
        @NotBlank String content
) {
}
