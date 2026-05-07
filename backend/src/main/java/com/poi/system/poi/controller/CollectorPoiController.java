package com.poi.system.poi.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.poi.dto.PoiDetailResponse;
import com.poi.system.poi.dto.PoiSummaryResponse;
import com.poi.system.poi.dto.PoiUpsertRequest;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/collector/pois")
@RequiredArgsConstructor
@PreAuthorize("hasRole('COLLECTOR')")
public class CollectorPoiController {

    private final PoiService poiService;

    @GetMapping
    public ApiResponse<List<PoiSummaryResponse>> listMine(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(poiService.listCollectorPois(userDetails.getUser().getId()));
    }

    @GetMapping("/{poiId}")
    public ApiResponse<PoiDetailResponse> detail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poiId
    ) {
        return ApiResponse.success(poiService.getCollectorPoi(userDetails.getUser().getId(), poiId));
    }

    @PostMapping
    public ApiResponse<PoiDetailResponse> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PoiUpsertRequest request
    ) {
        return ApiResponse.success(poiService.createPoi(userDetails.getUser().getId(), request));
    }

    @PutMapping("/{poiId}")
    public ApiResponse<PoiDetailResponse> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poiId,
            @Valid @RequestBody PoiUpsertRequest request
    ) {
        return ApiResponse.success(poiService.updatePoi(userDetails.getUser().getId(), poiId, request));
    }
}
