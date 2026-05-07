package com.poi.system.notice.dto;

import com.poi.system.notice.enums.NoticeReceiverScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BroadcastNoticeRequest(
        @NotBlank(message = "title is required")
        String title,
        @NotBlank(message = "content is required")
        String content,
        @NotNull(message = "receiverScope is required")
        NoticeReceiverScope receiverScope,
        List<String> roleCodes,
        List<Long> userIds
) {
}
