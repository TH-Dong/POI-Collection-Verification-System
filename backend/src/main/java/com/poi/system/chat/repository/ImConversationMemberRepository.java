package com.poi.system.chat.repository;

import com.poi.system.chat.entity.ImConversationMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImConversationMemberRepository extends JpaRepository<ImConversationMember, Long> {

    List<ImConversationMember> findByUserId(Long userId);

    List<ImConversationMember> findByConversationId(Long conversationId);

    Optional<ImConversationMember> findByConversationIdAndUserId(Long conversationId, Long userId);

    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);

    long countByUserIdAndUnreadCountGreaterThan(Long userId, long unreadCount);

    @Query("select coalesce(sum(m.unreadCount), 0) from ImConversationMember m where m.user.id = :userId")
    long sumUnreadCountByUserId(@Param("userId") Long userId);
}
