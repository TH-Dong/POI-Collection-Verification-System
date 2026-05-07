package com.poi.system.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record WeChatBindRequest(
        @NotBlank(message = "authCode is required") String authCode
) {
}
