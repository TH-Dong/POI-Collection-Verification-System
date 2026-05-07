package com.poi.system.user.repository;

import com.poi.system.user.entity.SysRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SysRoleRepository extends JpaRepository<SysRole, Long> {

    Optional<SysRole> findByCode(String code);
}
