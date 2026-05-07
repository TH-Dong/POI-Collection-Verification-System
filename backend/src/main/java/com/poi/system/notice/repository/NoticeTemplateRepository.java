package com.poi.system.notice.repository;

import com.poi.system.notice.entity.NoticeTemplate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeTemplateRepository extends JpaRepository<NoticeTemplate, Long> {

    Optional<NoticeTemplate> findByTemplateCode(String templateCode);
}
