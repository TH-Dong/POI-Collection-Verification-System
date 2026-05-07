package com.poi.system.notice.repository;

import com.poi.system.notice.entity.SysNoticeUser;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SysNoticeUserRepository extends JpaRepository<SysNoticeUser, Long> {

    List<SysNoticeUser> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndReadFlagFalse(Long userId);

    long countByNoticeId(Long noticeId);

    long countByNoticeIdAndReadFlagTrue(Long noticeId);
}
