package com.poi.system.security;

import com.poi.system.config.SecurityProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final SecurityProperties securityProperties;
    private final SecretKey secretKey;

    public JwtTokenProvider(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
        this.secretKey = buildSecretKey(securityProperties.getJwtSecret());
    }

    public String generateToken(CustomUserDetails userDetails) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(securityProperties.getAccessTokenTtl());

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim("uid", userDetails.getUser().getId())
                .claim("roles", userDetails.getAuthorities().stream().map(Object::toString).toList())
                .signWith(secretKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
    }

    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public String getTokenId(String token) {
        return parseClaims(token).getId();
    }

    public long getExpiresInSeconds() {
        return securityProperties.getAccessTokenTtl().toSeconds();
    }

    private SecretKey buildSecretKey(String rawSecret) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(rawSecret);
        } catch (IllegalArgumentException | DecodingException ex) {
            keyBytes = rawSecret.getBytes(StandardCharsets.UTF_8);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
