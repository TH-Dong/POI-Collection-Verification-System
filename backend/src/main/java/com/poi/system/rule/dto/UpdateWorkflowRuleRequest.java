package com.poi.system.rule.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateWorkflowRuleRequest(
        @NotBlank(message = "configValue is required")
        String configValue,
        Boolean active
) {
}
