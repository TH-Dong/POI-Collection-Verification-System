package com.poi.system.dictionary.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.dictionary.dto.DictItemResponse;
import com.poi.system.dictionary.dto.UpsertDictItemRequest;
import com.poi.system.dictionary.enums.SystemDictType;
import com.poi.system.dictionary.service.SystemDictService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class SystemDictionaryController {

    private final SystemDictService systemDictService;

    @GetMapping("/poi-categories")
    public ApiResponse<List<DictItemResponse>> listPoiCategories() {
        return ApiResponse.success(systemDictService.listActive(SystemDictType.POI_CATEGORY));
    }

    @GetMapping("/review-issues")
    public ApiResponse<List<DictItemResponse>> listReviewIssues() {
        return ApiResponse.success(systemDictService.listActive(SystemDictType.REVIEW_ISSUE));
    }

    @GetMapping("/admin/dictionaries")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<DictItemResponse>> listAll(@RequestParam SystemDictType type) {
        return ApiResponse.success(systemDictService.listAll(type));
    }

    @PostMapping("/admin/dictionaries")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DictItemResponse> create(@Valid @RequestBody UpsertDictItemRequest request) {
        return ApiResponse.success(systemDictService.create(request));
    }

    @PutMapping("/admin/dictionaries/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DictItemResponse> update(@PathVariable Long id, @Valid @RequestBody UpsertDictItemRequest request) {
        return ApiResponse.success(systemDictService.update(id, request));
    }
}
