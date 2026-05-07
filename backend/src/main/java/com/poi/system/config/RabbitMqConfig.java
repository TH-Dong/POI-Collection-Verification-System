package com.poi.system.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AppMessagingProperties.class)
public class RabbitMqConfig {

    @Bean
    public MessageConverter rabbitMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter rabbitMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(rabbitMessageConverter);
        return template;
    }

    @Bean
    public DirectExchange noticeExchange(AppMessagingProperties properties) {
        return new DirectExchange(properties.noticeExchange(), true, false);
    }

    @Bean
    public Queue noticeQueue() {
        return new Queue("poi.notice.queue", true);
    }

    @Bean
    public Binding noticeBinding(Queue noticeQueue, DirectExchange noticeExchange, AppMessagingProperties properties) {
        return BindingBuilder.bind(noticeQueue).to(noticeExchange).with(properties.noticeRoutingKey());
    }
}
