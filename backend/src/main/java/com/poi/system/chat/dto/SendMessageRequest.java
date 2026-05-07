package com.poi.system.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record SendMessageRequest(
        @NotBlank(message = "content is required")
        String content
) {
}
