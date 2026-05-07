package com.poi.system.rule.dto;

public record WorkflowRuleResponse(
        Long id,
        String code,
        String name,
        String configValue,
        String description,
        boolean active
) {
}
