package com.poi.system.auth.service;

import com.poi.system.audit.service.AuditLogService;
import com.poi.system.auth.dto.LoginRequest;
import com.poi.system.auth.dto.LoginResponse;
import com.poi.system.auth.dto.UserSummary;
import com.poi.system.auth.dto.WeChatBindRequest;
import com.poi.system.auth.dto.WeChatBindingResponse;
import com.poi.system.auth.dto.WeChatLoginRequest;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.security.PermissionCodes;
import com.poi.system.security.CustomUserDetails;
import com.poi.system.security.JwtTokenProvider;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate stringRedisTemplate;
    private final SysUserRepository sysUserRepository;
    private final WeChatAuthService weChatAuthService;
    private final AuditLogService auditLogService;

    public LoginResponse login(LoginRequest request, String loginIp) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            LoginResponse response = issueToken(userDetails);
            auditLogService.recordLogin(userDetails.getUser().getId(), userDetails.getUsername(), loginIp, true, "password login");
            return response;
        } catch (BadCredentialsException ex) {
            auditLogService.recordLogin(null, request.username(), loginIp, false, "invalid username or password");
            throw new BusinessException("AUTH_002", "invalid username or password", HttpStatus.UNAUTHORIZED);
        }
    }

    public UserSummary currentUser(CustomUserDetails userDetails) {
        return toSummary(userDetails.getUser());
    }

    public LoginResponse loginByWeChat(WeChatLoginRequest request, String loginIp) {
        WeChatAuthService.WeChatProfile profile = weChatAuthService.resolveProfile(request.authCode());
        SysUser user = sysUserRepository.findByWechatOpenId(profile.openId()).orElse(null);
        if (user == null) {
            auditLogService.recordLogin(null, profile.nickname(), loginIp, false, "wechat account is not bound");
            throw new BusinessException("WX_003", "current wechat account is not bound", HttpStatus.UNAUTHORIZED);
        }
        LoginResponse response = issueToken(new CustomUserDetails(user));
        auditLogService.recordLogin(user.getId(), user.getUsername(), loginIp, true, "wechat login");
        return response;
    }

    public WeChatBindingResponse getWeChatBinding(CustomUserDetails userDetails) {
        return toWeChatBindingResponse(userDetails.getUser());
    }

    public WeChatBindingResponse bindWeChat(CustomUserDetails userDetails, WeChatBindRequest request) {
        SysUser user = reloadUser(userDetails.getUser().getId());
        WeChatAuthService.WeChatProfile profile = weChatAuthService.resolveProfile(request.authCode());
        if (sysUserRepository.existsByWechatOpenIdAndIdNot(profile.openId(), user.getId())) {
            throw new BusinessException("WX_004", "wechat account is already bound by another user", HttpStatus.CONFLICT);
        }
        user.setWechatOpenId(profile.openId());
        user.setWechatUnionId(profile.unionId());
        user.setWechatNickname(profile.nickname());
        user.setWechatBoundAt(profile.issuedAt());
        SysUser savedUser = sysUserRepository.save(user);
        auditLogService.recordOperation(savedUser.getId(), "USER", savedUser.getId(), "WECHAT_BIND", "绑定微信账号：" + profile.nickname());
        return toWeChatBindingResponse(savedUser);
    }

    public WeChatBindingResponse unbindWeChat(CustomUserDetails userDetails) {
        SysUser user = reloadUser(userDetails.getUser().getId());
        user.setWechatOpenId(null);
        user.setWechatUnionId(null);
        user.setWechatNickname(null);
        user.setWechatBoundAt(null);
        SysUser savedUser = sysUserRepository.save(user);
        auditLogService.recordOperation(savedUser.getId(), "USER", savedUser.getId(), "WECHAT_UNBIND", "解绑微信账号");
        return toWeChatBindingResponse(savedUser);
    }

    private LoginResponse issueToken(CustomUserDetails userDetails) {
        String accessToken = jwtTokenProvider.generateToken(userDetails);
        String tokenId = jwtTokenProvider.getTokenId(accessToken);
        long expiresIn = jwtTokenProvider.getExpiresInSeconds();
        stringRedisTemplate.opsForValue().set("auth:access:" + tokenId, userDetails.getUser().getId().toString(), expiresIn, TimeUnit.SECONDS);

        return new LoginResponse(
                accessToken,
                "Bearer",
                expiresIn,
                toSummary(userDetails.getUser())
        );
    }

    private UserSummary toSummary(SysUser user) {
        var roleCodes = user.getRoles().stream().map(role -> role.getCode()).toList();
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getRealName(),
                roleCodes,
                PermissionCodes.resolve(roleCodes).stream().toList(),
                user.getWechatBoundAt() != null,
                user.getWechatNickname(),
                user.getWechatBoundAt()
        );
    }

    private WeChatBindingResponse toWeChatBindingResponse(SysUser user) {
        return new WeChatBindingResponse(
                user.getWechatBoundAt() != null,
                maskOpenId(user.getWechatOpenId()),
                user.getWechatNickname(),
                user.getWechatBoundAt()
        );
    }

    private SysUser reloadUser(Long userId) {
        return sysUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
    }

    private String maskOpenId(String openId) {
        if (openId == null || openId.length() < 8) {
            return openId;
        }
        return openId.substring(0, 4) + "****" + openId.substring(openId.length() - 4);
    }
}
