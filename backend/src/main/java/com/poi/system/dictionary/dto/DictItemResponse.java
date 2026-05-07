package com.poi.system.dictionary.dto;

import com.poi.system.dictionary.enums.SystemDictType;

public record DictItemResponse(
        Long id,
        SystemDictType type,
        String itemCode,
        String itemName,
        String description,
        Integer sortOrder,
        boolean active,
        boolean systemDefault
) {
}
