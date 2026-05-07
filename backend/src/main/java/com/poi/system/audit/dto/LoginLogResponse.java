package com.poi.system.audit.dto;

import java.time.Instant;

public record LoginLogResponse(
        Long id,
        Long userId,
        String username,
        String loginIp,
        String loginResult,
        String resultMessage,
        Instant createdAt
) {
}
