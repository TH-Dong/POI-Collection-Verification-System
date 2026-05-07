package com.poi.system.chat.repository;

import com.poi.system.chat.entity.ImMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImMessageRepository extends JpaRepository<ImMessage, Long> {

    List<ImMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
}
