package com.poi.system.user.repository;

import com.poi.system.user.entity.SysUser;
import com.poi.system.common.enums.UserStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SysUserRepository extends JpaRepository<SysUser, Long> {

    Optional<SysUser> findByUsername(String username);

    Optional<SysUser> findByWechatOpenId(String wechatOpenId);

    boolean existsByUsername(String username);

    boolean existsByWechatOpenIdAndIdNot(String wechatOpenId, Long id);

    List<SysUser> findByStatusOrderByIdAsc(UserStatus status);

    @Query("select distinct u from SysUser u join u.roles r where r.code = :roleCode and u.status = :status order by u.id asc")
    List<SysUser> findByRoleCodeAndStatusOrderByIdAsc(@Param("roleCode") String roleCode, @Param("status") UserStatus status);
}
