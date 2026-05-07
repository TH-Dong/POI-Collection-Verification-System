package com.poi.system.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.config.WeChatProperties;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class WeChatAuthService {

    private final WeChatProperties weChatProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public WeChatAuthService(WeChatProperties weChatProperties, ObjectMapper objectMapper) {
        this.weChatProperties = weChatProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public WeChatProfile resolveProfile(String authCode) {
        return switch (weChatProperties.provider()) {
            case MOCK -> resolveMockProfile(authCode);
            case OPEN_PLATFORM -> resolveOpenPlatformProfile(authCode);
        };
    }

    public WeChatProfile resolveMockProfile(String authCode) {
        String normalized = normalizeCode(authCode);
        if (normalized == null) {
            throw new BusinessException("WX_001", "invalid wechat auth code", HttpStatus.BAD_REQUEST);
        }
        String openId = "wx_open_" + digest(normalized).substring(0, 16);
        String unionId = "wx_union_" + digest("union:" + normalized).substring(0, 16);
        String nickname = buildNickname(normalized);
        return new WeChatProfile(openId, unionId, nickname, Instant.now());
    }

    private WeChatProfile resolveOpenPlatformProfile(String authCode) {
        String normalized = normalizeCode(authCode);
        if (normalized == null) {
            throw new BusinessException("WX_001", "invalid wechat auth code", HttpStatus.BAD_REQUEST);
        }
        if (weChatProperties.appId() == null || weChatProperties.appId().isBlank()
                || weChatProperties.appSecret() == null || weChatProperties.appSecret().isBlank()) {
            throw new BusinessException("WX_005", "wechat appId/appSecret is not configured", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            AccessTokenResponse tokenResponse = exchangeCode(normalized);
            UserInfoResponse userInfoResponse = fetchUserInfo(tokenResponse.accessToken(), tokenResponse.openId());

            String nickname = firstNonBlank(userInfoResponse.nickname(), buildNickname(normalized));
            String unionId = firstNonBlank(userInfoResponse.unionId(), tokenResponse.unionId());
            return new WeChatProfile(
                    tokenResponse.openId(),
                    unionId,
                    nickname,
                    Instant.now()
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (IOException ex) {
            log.error("Failed to resolve WeChat identity due to IO error", ex);
            throw new BusinessException("WX_006", "failed to call wechat open api", HttpStatus.BAD_GATEWAY);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("WeChat open api request interrupted", ex);
            throw new BusinessException("WX_007", "wechat open api request interrupted", HttpStatus.BAD_GATEWAY);
        }
    }

    private AccessTokenResponse exchangeCode(String authCode) throws IOException, InterruptedException {
        String query = "?appid=" + encode(weChatProperties.appId())
                + "&secret=" + encode(weChatProperties.appSecret())
                + "&code=" + encode(authCode)
                + "&grant_type=authorization_code";
        JsonNode payload = sendGet("/sns/oauth2/access_token" + query);
        if (payload.path("openid").isMissingNode() || payload.path("access_token").isMissingNode()) {
            throw wechatApiException(payload, "failed to exchange wechat auth code");
        }
        return new AccessTokenResponse(
                payload.path("access_token").asText(),
                payload.path("openid").asText(),
                nullIfBlank(payload.path("unionid").asText(null))
        );
    }

    private UserInfoResponse fetchUserInfo(String accessToken, String openId) throws IOException, InterruptedException {
        String query = "?access_token=" + encode(accessToken)
                + "&openid=" + encode(openId)
                + "&lang=" + encode(weChatProperties.userInfoLang());
        JsonNode payload = sendGet("/sns/userinfo" + query);
        if (payload.path("errcode").isNumber()) {
            throw wechatApiException(payload, "failed to fetch wechat user info");
        }
        return new UserInfoResponse(
                nullIfBlank(payload.path("nickname").asText(null)),
                nullIfBlank(payload.path("unionid").asText(null))
        );
    }

    private JsonNode sendGet(String pathAndQuery) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(weChatProperties.apiBaseUrl() + pathAndQuery))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 400) {
            throw new BusinessException("WX_008", "wechat open api http error: " + response.statusCode(), HttpStatus.BAD_GATEWAY);
        }
        return objectMapper.readTree(response.body());
    }

    private BusinessException wechatApiException(JsonNode payload, String fallbackMessage) {
        String errCode = payload.path("errcode").asText("");
        String errMsg = payload.path("errmsg").asText("");
        String resolvedMessage = fallbackMessage;
        if (!errCode.isBlank() || !errMsg.isBlank()) {
            resolvedMessage = "wechat open api error"
                    + (errCode.isBlank() ? "" : " [" + errCode + "]")
                    + (errMsg.isBlank() ? "" : ": " + errMsg);
        }
        return new BusinessException("WX_009", resolvedMessage, HttpStatus.BAD_GATEWAY);
    }

    private String normalizeCode(String authCode) {
        if (authCode == null || authCode.isBlank()) {
            return null;
        }
        return authCode.trim();
    }

    private String buildNickname(String normalizedCode) {
        String compact = normalizedCode.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        String suffix = compact.length() <= 6 ? compact : compact.substring(compact.length() - 6);
        return "微信用户-" + suffix;
    }

    private String digest(String value) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] digest = messageDigest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new BusinessException("WX_002", "failed to resolve wechat identity", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String nullIfBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    public record WeChatProfile(
            String openId,
            String unionId,
            String nickname,
            Instant issuedAt
    ) {
    }

    private record AccessTokenResponse(
            String accessToken,
            String openId,
            String unionId
    ) {
    }

    private record UserInfoResponse(
            String nickname,
            String unionId
    ) {
    }
}
