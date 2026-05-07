package com.poi.system.poi.dto;

import com.poi.system.poi.enums.PoiStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PoiUpsertRequest(
        @NotBlank(message = "poiName is required") String poiName,
        String categoryCode,
        String description,
        String coverImageObjectName,
        String coverImageUrl,
        Double longitude,
        Double latitude,
        String addressText,
        String ocrText,
        Double ocrConfidence,
        String ocrProvider,
        @NotNull(message = "status is required") PoiStatus status
) {
}
