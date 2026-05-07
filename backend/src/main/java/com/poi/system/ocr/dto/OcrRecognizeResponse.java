package com.poi.system.ocr.dto;

public record OcrRecognizeResponse(
        String extractedText,
        String suggestedPoiName,
        String suggestedDescription,
        String suggestedCategoryCode,
        double confidence,
        String provider
) {
}
