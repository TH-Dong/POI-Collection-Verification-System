package com.poi.system.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.wechat")
public record WeChatProperties(
        Provider provider,
        String appId,
        String appSecret,
        String apiBaseUrl,
        String userInfoLang
) {

    public WeChatProperties {
        provider = provider == null ? Provider.MOCK : provider;
        apiBaseUrl = normalizeBaseUrl(apiBaseUrl);
        userInfoLang = userInfoLang == null || userInfoLang.isBlank() ? "zh_CN" : userInfoLang.trim();
    }

    private static String normalizeBaseUrl(String rawBaseUrl) {
        String resolved = rawBaseUrl == null || rawBaseUrl.isBlank()
                ? "https://api.weixin.qq.com"
                : rawBaseUrl.trim();
        return resolved.endsWith("/") ? resolved.substring(0, resolved.length() - 1) : resolved;
    }

    public boolean isOpenPlatformEnabled() {
        return provider == Provider.OPEN_PLATFORM;
    }

    public enum Provider {
        MOCK,
        OPEN_PLATFORM
    }
}
