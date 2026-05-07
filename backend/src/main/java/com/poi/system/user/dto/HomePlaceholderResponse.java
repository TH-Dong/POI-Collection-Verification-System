package com.poi.system.user.dto;

import java.util.List;

public record HomePlaceholderResponse(
        String title,
        String message,
        List<String> roles
) {
}
