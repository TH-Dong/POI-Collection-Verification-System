package com.poi.system.notice.dto;

import com.poi.system.notice.enums.NoticeType;
import java.io.Serializable;
import java.util.List;
import java.util.Map;

public record BusinessNoticeEvent(
        String templateCode,
        NoticeType noticeType,
        String fallbackTitle,
        String fallbackContent,
        Long createdByUserId,
        List<Long> receiverUserIds,
        Map<String, String> variables
) implements Serializable {
}
