package com.poi.system.notice.dto;

import com.poi.system.notice.enums.NoticeReceiverScope;
import com.poi.system.notice.enums.NoticeType;
import java.time.Instant;
import java.util.List;

public record NoticeItemResponse(
        Long noticeUserId,
        Long noticeId,
        NoticeType noticeType,
        String templateCode,
        String title,
        String content,
        NoticeReceiverScope receiverScope,
        List<String> targetRoles,
        boolean readFlag,
        Instant readAt,
        Instant createdAt,
        String createdByName,
        long totalReceivers,
        long readReceivers
) {
}
