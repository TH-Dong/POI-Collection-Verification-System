package com.poi.system.audit.repository;

import com.poi.system.audit.entity.SysLoginLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SysLoginLogRepository extends JpaRepository<SysLoginLog, Long> {

    List<SysLoginLog> findAllByOrderByCreatedAtDesc();
}
