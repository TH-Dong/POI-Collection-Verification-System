package com.poi.system.poi.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.poi.dto.PoiDetailResponse;
import com.poi.system.poi.dto.PoiSummaryResponse;
import com.poi.system.poi.service.PoiService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/pois")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPoiController {

    private final PoiService poiService;

    @GetMapping
    public ApiResponse<List<PoiSummaryResponse>> listAll() {
        return ApiResponse.success(poiService.listAllPois());
    }

    @GetMapping("/{poiId}")
    public ApiResponse<PoiDetailResponse> detail(@PathVariable Long poiId) {
        return ApiResponse.success(poiService.getPoiDetail(poiId));
    }
}
