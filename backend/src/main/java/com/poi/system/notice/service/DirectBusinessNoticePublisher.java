package com.poi.system.notice.service;

import com.poi.system.notice.dto.BusinessNoticeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.messaging", name = "rabbit-enabled", havingValue = "false", matchIfMissing = true)
public class DirectBusinessNoticePublisher implements BusinessNoticePublisher {

    private final NoticeService noticeService;

    @Override
    public void publish(BusinessNoticeEvent event) {
        noticeService.dispatchEvent(event);
    }
}
