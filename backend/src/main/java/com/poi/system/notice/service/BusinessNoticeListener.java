package com.poi.system.notice.service;

import com.poi.system.notice.dto.BusinessNoticeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.messaging", name = "rabbit-enabled", havingValue = "true")
public class BusinessNoticeListener {

    private final NoticeService noticeService;

    @RabbitListener(queues = "poi.notice.queue")
    public void handle(BusinessNoticeEvent event) {
        noticeService.dispatchEvent(event);
    }
}
