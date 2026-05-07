package com.poi.system.notice.service;

import com.poi.system.notice.dto.BusinessNoticeEvent;

public interface BusinessNoticePublisher {

    void publish(BusinessNoticeEvent event);
}
