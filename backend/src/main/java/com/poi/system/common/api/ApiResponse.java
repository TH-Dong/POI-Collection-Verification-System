package com.poi.system.common.api;

import com.poi.system.common.util.RequestIdHolder;
import java.time.Instant;

public record ApiResponse<T>(
        String code,
        String message,
        T data,
        String requestId,
        Instant timestamp
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("0", "success", data, RequestIdHolder.get(), Instant.now());
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>("0", "success", null, RequestIdHolder.get(), Instant.now());
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(code, message, null, RequestIdHolder.get(), Instant.now());
    }
}
