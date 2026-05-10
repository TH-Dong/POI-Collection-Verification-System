package com.poi.system.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 64) String displayName,
        @Size(max = 512) String avatarUrl
) {
}
