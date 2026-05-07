package com.poi.system.task.dto;

import com.poi.system.task.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTaskStatusRequest(
        @NotNull(message = "status is required")
        TaskStatus status
) {
}
