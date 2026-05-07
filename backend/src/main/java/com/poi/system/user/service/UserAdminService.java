package com.poi.system.user.service;

import com.poi.system.common.exception.BusinessException;
import com.poi.system.user.dto.UpdateUserAdminRequest;
import com.poi.system.user.dto.UserAdminResponse;
import com.poi.system.user.entity.SysRole;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysRoleRepository;
import com.poi.system.user.repository.SysUserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final SysUserRepository sysUserRepository;
    private final SysRoleRepository sysRoleRepository;

    @Transactional(readOnly = true)
    public List<UserAdminResponse> listUsers() {
        return sysUserRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserAdminResponse updateUser(Long userId, UpdateUserAdminRequest request) {
        SysUser user = sysUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
        List<SysRole> roles = request.roles().stream()
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .map(code -> sysRoleRepository.findByCode(code)
                        .orElseThrow(() -> new BusinessException("ROLE_404", "role not found: " + code, HttpStatus.NOT_FOUND)))
                .toList();
        user.setStatus(request.status());
        user.setRoles(new LinkedHashSet<>(roles));
        return toResponse(sysUserRepository.save(user));
    }

    private UserAdminResponse toResponse(SysUser user) {
        return new UserAdminResponse(
                user.getId(),
                user.getUsername(),
                user.getRealName(),
                user.getPhone(),
                user.getStatus(),
                user.getRoles().stream().map(SysRole::getCode).toList(),
                user.getWechatBoundAt() != null,
                user.getWechatNickname(),
                user.getWechatBoundAt()
        );
    }
}
