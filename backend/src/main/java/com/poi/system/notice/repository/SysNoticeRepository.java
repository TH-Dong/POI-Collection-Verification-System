package com.poi.system.notice.repository;

import com.poi.system.notice.entity.SysNotice;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SysNoticeRepository extends JpaRepository<SysNotice, Long> {

    List<SysNotice> findAllByOrderByCreatedAtDesc();
}
