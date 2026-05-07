package com.poi.system.file.dto;

public record FileUploadResponse(
        String objectName,
        String originalFilename,
        String contentType,
        long size,
        String url,
        String storageMode
) {
}
