package com.poi.system.auth.dto;

import java.time.Instant;

public record WeChatBindingResponse(
        boolean bound,
        String openIdMasked,
        String nickname,
        Instant boundAt
) {
}
