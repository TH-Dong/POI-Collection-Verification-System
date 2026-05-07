package com.poi.system.audit.repository;

import com.poi.system.audit.entity.SysOperationLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SysOperationLogRepository extends JpaRepository<SysOperationLog, Long> {

    List<SysOperationLog> findAllByOrderByCreatedAtDesc();
}
