package com.poi.system.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ocr")
public record OcrProperties(
        Provider provider,
        String baseUrl,
        String apiKey,
        String model,
        Duration timeout
) {

    public OcrProperties {
        provider = provider == null ? Provider.MOCK : provider;
        baseUrl = normalizeBaseUrl(baseUrl);
        model = model == null || model.isBlank() ? "Qwen/Qwen3-VL-32B-Thinking" : model.trim();
        timeout = timeout == null || timeout.isZero() || timeout.isNegative() ? Duration.ofSeconds(45) : timeout;
    }

    private static String normalizeBaseUrl(String rawBaseUrl) {
        String resolved = rawBaseUrl == null || rawBaseUrl.isBlank()
                ? "https://api.siliconflow.cn/v1"
                : rawBaseUrl.trim();
        return resolved.endsWith("/") ? resolved.substring(0, resolved.length() - 1) : resolved;
    }

    public enum Provider {
        MOCK,
        SILICONFLOW
    }
}
