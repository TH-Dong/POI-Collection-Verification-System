package com.poi.system.notice.dto;

public record NoticeTemplateResponse(
        Long id,
        String templateCode,
        String name,
        String titleTemplate,
        String contentTemplate,
        boolean enabled
) {
}
