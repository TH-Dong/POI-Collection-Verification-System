package com.poi.system.chat.realtime;

import com.poi.system.chat.dto.ChatConversationSummaryResponse;
import com.poi.system.chat.dto.ChatMessageResponse;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatRealtimeService {

    private final ChatWebSocketHandler chatWebSocketHandler;

    public boolean isOnline(Long userId) {
        return chatWebSocketHandler.isOnline(userId);
    }

    public void pushConversationEvent(Long userId, ChatConversationSummaryResponse conversation, ChatMessageResponse message, long totalUnreadCount) {
        chatWebSocketHandler.sendToUser(userId, Map.of(
                "type", "CHAT_MESSAGE",
                "conversation", conversation,
                "message", message,
                "totalUnreadCount", totalUnreadCount
        ));
    }

    public void pushReadEvent(Long userId, Long conversationId, long totalUnreadCount) {
        chatWebSocketHandler.sendToUser(userId, Map.of(
                "type", "CHAT_READ",
                "conversationId", conversationId,
                "totalUnreadCount", totalUnreadCount
        ));
    }
}
