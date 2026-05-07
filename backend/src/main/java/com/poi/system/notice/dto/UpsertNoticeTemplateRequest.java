package com.poi.system.notice.dto;

import jakarta.validation.constraints.NotBlank;

public record UpsertNoticeTemplateRequest(
        @NotBlank(message = "templateCode is required")
        String templateCode,
        @NotBlank(message = "name is required")
        String name,
        @NotBlank(message = "titleTemplate is required")
        String titleTemplate,
        @NotBlank(message = "contentTemplate is required")
        String contentTemplate,
        Boolean enabled
) {
}
