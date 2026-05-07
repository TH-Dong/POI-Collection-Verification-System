package com.poi.system.user.dto;

import com.poi.system.common.enums.UserStatus;
import java.time.Instant;
import java.util.List;

public record UserAdminResponse(
        Long id,
        String username,
        String realName,
        String phone,
        UserStatus status,
        List<String> roles,
        boolean wechatBound,
        String wechatNickname,
        Instant wechatBoundAt
) {
}
