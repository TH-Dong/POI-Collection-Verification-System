package com.poi.system.dispute.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.dispute.dto.ArbitrateDisputeRequest;
import com.poi.system.dispute.dto.CreateDisputeRequest;
import com.poi.system.dispute.dto.DisputeCommentRequest;
import com.poi.system.dispute.dto.DisputeDetailResponse;
import com.poi.system.dispute.dto.DisputeEscalateRequest;
import com.poi.system.dispute.dto.DisputeSummaryResponse;
import com.poi.system.dispute.service.DisputeService;
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
@RequestMapping("/api/v1/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('COLLECTOR', 'VERIFIER', 'ADMIN')")
    public ApiResponse<List<DisputeSummaryResponse>> list(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(disputeService.listDisputes(userDetails.getUser().getId(), extractRoles(userDetails)));
    }

    @GetMapping("/{disputeId}")
    @PreAuthorize("hasAnyRole('COLLECTOR', 'VERIFIER', 'ADMIN')")
    public ApiResponse<DisputeDetailResponse> detail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long disputeId
    ) {
        return ApiResponse.success(disputeService.getDisputeDetail(userDetails.getUser().getId(), extractRoles(userDetails), disputeId));
    }

    @PostMapping
    @PreAuthorize("hasRole('COLLECTOR')")
    public ApiResponse<DisputeDetailResponse> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateDisputeRequest request
    ) {
        return ApiResponse.success(disputeService.createDispute(userDetails.getUser().getId(), request));
    }

    @PostMapping("/{disputeId}/comments")
    @PreAuthorize("hasAnyRole('COLLECTOR', 'VERIFIER', 'ADMIN')")
    public ApiResponse<DisputeDetailResponse> comment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long disputeId,
            @Valid @RequestBody DisputeCommentRequest request
    ) {
        return ApiResponse.success(disputeService.addComment(userDetails.getUser().getId(), extractRoles(userDetails), disputeId, request));
    }

    @PostMapping("/{disputeId}/escalate")
    @PreAuthorize("hasAnyRole('VERIFIER', 'ADMIN')")
    public ApiResponse<DisputeDetailResponse> escalate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long disputeId,
            @Valid @RequestBody DisputeEscalateRequest request
    ) {
        return ApiResponse.success(disputeService.escalateDispute(userDetails.getUser().getId(), extractRoles(userDetails), disputeId, request));
    }

    @PostMapping("/{disputeId}/arbitrate")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<DisputeDetailResponse> arbitrate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long disputeId,
            @Valid @RequestBody ArbitrateDisputeRequest request
    ) {
        return ApiResponse.success(disputeService.arbitrateDispute(userDetails.getUser().getId(), extractRoles(userDetails), disputeId, request));
    }

    private List<String> extractRoles(CustomUserDetails userDetails) {
        return userDetails.getUser().getRoles().stream().map(role -> role.getCode()).toList();
    }
}
