package com.poi.system.auth.dto;

import java.time.Instant;
import java.util.List;

public record UserSummary(
        Long id,
        String username,
        String realName,
        List<String> roles,
        List<String> permissions,
        boolean wechatBound,
        String wechatNickname,
        Instant wechatBoundAt
) {
}
