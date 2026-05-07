package com.poi.system.notice.service;

import com.poi.system.config.AppMessagingProperties;
import com.poi.system.notice.dto.BusinessNoticeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.messaging", name = "rabbit-enabled", havingValue = "true")
public class RabbitBusinessNoticePublisher implements BusinessNoticePublisher {

    private final RabbitTemplate rabbitTemplate;
    private final AppMessagingProperties appMessagingProperties;

    @Override
    public void publish(BusinessNoticeEvent event) {
        rabbitTemplate.convertAndSend(appMessagingProperties.noticeExchange(), appMessagingProperties.noticeRoutingKey(), event);
    }
}
