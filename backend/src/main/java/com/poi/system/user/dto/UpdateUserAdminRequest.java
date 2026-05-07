package com.poi.system.user.dto;

import com.poi.system.common.enums.UserStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UpdateUserAdminRequest(
        @NotNull(message = "status is required")
        UserStatus status,
        @NotEmpty(message = "roles is required")
        List<String> roles
) {
}
