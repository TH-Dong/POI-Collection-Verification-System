package com.poi.system.audit.dto;

import java.time.Instant;

public record OperationLogResponse(
        Long id,
        Long operatorId,
        String operatorName,
        String bizType,
        Long bizId,
        String actionCode,
        String content,
        String requestId,
        Instant createdAt
) {
}
