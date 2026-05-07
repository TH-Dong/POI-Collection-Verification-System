package com.poi.system.dictionary.dto;

import com.poi.system.dictionary.enums.SystemDictType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpsertDictItemRequest(
        @NotNull(message = "type is required")
        SystemDictType type,
        @NotBlank(message = "itemCode is required")
        String itemCode,
        @NotBlank(message = "itemName is required")
        String itemName,
        String description,
        Integer sortOrder,
        Boolean active
) {
}
