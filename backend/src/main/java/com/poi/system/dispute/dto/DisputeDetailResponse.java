package com.poi.system.dispute.dto;

import com.poi.system.poi.dto.PoiDetailResponse;
import java.util.List;

public record DisputeDetailResponse(
        DisputeSummaryResponse summary,
        PoiDetailResponse poi,
        List<DisputeCommentResponse> comments,
        ArbitrationRecordResponse arbitration
) {
}
