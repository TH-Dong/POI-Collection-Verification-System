package com.poi.system.task.dto;

import com.poi.system.task.enums.TaskPriority;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.enums.TaskType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record TaskUpsertRequest(
        @NotNull(message = "taskType is required")
        TaskType taskType,
        @NotBlank(message = "bizType is required")
        String bizType,
        @NotNull(message = "bizId is required")
        Long bizId,
        @NotBlank(message = "title is required")
        String title,
        String description,
        Long assigneeId,
        TaskPriority priority,
        TaskStatus status,
        Instant dueAt
) {
}
