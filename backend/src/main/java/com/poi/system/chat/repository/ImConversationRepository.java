package com.poi.system.chat.repository;

import com.poi.system.chat.entity.ImConversation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImConversationRepository extends JpaRepository<ImConversation, Long> {

    Optional<ImConversation> findByPrivateKey(String privateKey);

    Optional<ImConversation> findByGroupCode(String groupCode);

    List<ImConversation> findByPoiIdOrderByUpdatedAtDesc(Long poiId);

    @Query("select distinct c from ImConversation c join ImConversationMember m on m.conversation = c where m.user.id = :userId")
    List<ImConversation> findAllByMemberUserId(@Param("userId") Long userId);
}
