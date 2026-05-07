package com.poi.system.ocr.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.ocr.dto.OcrRecognizeResponse;
import com.poi.system.ocr.service.OcrService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ocr")
public class OcrController {

    private final OcrService ocrService;

    @PostMapping("/recognize")
    @PreAuthorize("hasAnyRole('COLLECTOR', 'VERIFIER', 'ADMIN')")
    public ApiResponse<OcrRecognizeResponse> recognize(@RequestParam("file") @NotNull MultipartFile file) {
        return ApiResponse.success(ocrService.recognize(file));
    }
}
