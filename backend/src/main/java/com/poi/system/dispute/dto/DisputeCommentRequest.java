package com.poi.system.dispute.dto;

import jakarta.validation.constraints.NotBlank;

public record DisputeCommentRequest(
        @NotBlank String content
) {
}
