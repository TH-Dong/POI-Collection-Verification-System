package com.poi.system.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.messaging")
public record AppMessagingProperties(
        boolean rabbitEnabled,
        String noticeExchange,
        String noticeRoutingKey
) {
}
