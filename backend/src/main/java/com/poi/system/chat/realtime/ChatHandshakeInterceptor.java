package com.poi.system.chat.realtime;

import com.poi.system.common.enums.UserStatus;
import com.poi.system.security.JwtTokenProvider;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import io.jsonwebtoken.JwtException;
import java.net.URI;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class ChatHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final SysUserRepository sysUserRepository;
    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        try {
            String tokenId = jwtTokenProvider.getTokenId(token);
            if (Boolean.FALSE.equals(stringRedisTemplate.hasKey("auth:access:" + tokenId))) {
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }
            Long userId = ((Number) jwtTokenProvider.parseClaims(token).get("uid")).longValue();
            SysUser user = sysUserRepository.findById(userId).orElse(null);
            if (user == null || user.getStatus() != UserStatus.ACTIVE) {
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }
            attributes.put("userId", user.getId());
            attributes.put("username", user.getUsername());
            attributes.put("realName", user.getRealName());
            attributes.put("roles", user.getRoles().stream().map(role -> role.getCode()).toList());
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
    }

    private String extractToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String token = servletRequest.getServletRequest().getParameter("token");
            if (token != null && !token.isBlank()) {
                return token;
            }
        }
        URI uri = request.getURI();
        if (uri.getQuery() == null || uri.getQuery().isBlank()) {
            return null;
        }
        for (String pair : uri.getQuery().split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2 && "token".equals(parts[0])) {
                return parts[1];
            }
        }
        return null;
    }
}
