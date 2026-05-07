package com.poi.system.poi.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.poi.dto.PoiDetailResponse;
import com.poi.system.poi.dto.PoiReviewRequest;
import com.poi.system.poi.dto.PoiSummaryResponse;
import com.poi.system.poi.service.PoiService;
import com.poi.system.security.CustomUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/verifier/pois")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VERIFIER')")
public class VerifierPoiController {

    private final PoiService poiService;

    @GetMapping("/pending")
    public ApiResponse<List<PoiSummaryResponse>> listPending() {
        return ApiResponse.success(poiService.listVerifierPendingPois());
    }

    @GetMapping("/{poiId}")
    public ApiResponse<PoiDetailResponse> detail(@PathVariable Long poiId) {
        return ApiResponse.success(poiService.getPoiDetail(poiId));
    }

    @PostMapping("/{poiId}/review")
    public ApiResponse<PoiDetailResponse> review(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poiId,
            @Valid @RequestBody PoiReviewRequest request
    ) {
        return ApiResponse.success(poiService.reviewPoi(userDetails.getUser().getId(), poiId, request));
    }
}
