package com.poi.system.task.dto;

import com.poi.system.task.enums.TaskPriority;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.enums.TaskType;
import java.time.Instant;
import java.util.List;

public record TaskSummaryResponse(
        Long id,
        TaskType taskType,
        String bizType,
        Long bizId,
        String title,
        String description,
        TaskStatus status,
        TaskPriority priority,
        Long assigneeId,
        String assigneeName,
        List<String> assigneeRoles,
        Long createdById,
        String createdByName,
        String sourceEvent,
        Instant dueAt,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt,
        boolean overdue
) {
}
