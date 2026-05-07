package com.poi.system.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record WeChatLoginRequest(
        @NotBlank(message = "authCode is required") String authCode
) {
}
