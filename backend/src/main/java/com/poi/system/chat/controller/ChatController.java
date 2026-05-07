package com.poi.system.chat.controller;

import com.poi.system.chat.dto.ChatConversationDetailResponse;
import com.poi.system.chat.dto.ChatConversationSummaryResponse;
import com.poi.system.chat.dto.ChatMessageResponse;
import com.poi.system.chat.dto.ChatUnreadResponse;
import com.poi.system.chat.dto.SendMessageRequest;
import com.poi.system.chat.service.ChatService;
import com.poi.system.common.api.ApiResponse;
import com.poi.system.security.CustomUserDetails;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chat")
@PreAuthorize("isAuthenticated()")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    public ApiResponse<List<ChatConversationSummaryResponse>> listConversations(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(chatService.listConversations(userDetails.getUser().getId(), roles(userDetails)));
    }

    @GetMapping("/unread-count")
    public ApiResponse<ChatUnreadResponse> unreadCount(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(chatService.getUnreadSummary(userDetails.getUser().getId(), roles(userDetails)));
    }

    @GetMapping("/conversations/{conversationId}")
    public ApiResponse<ChatConversationDetailResponse> getConversation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long conversationId
    ) {
        return ApiResponse.success(chatService.getConversationDetail(userDetails.getUser().getId(), roles(userDetails), conversationId));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ApiResponse<ChatMessageResponse> sendMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ApiResponse.success(chatService.sendMessage(userDetails.getUser().getId(), roles(userDetails), conversationId, request.content()));
    }

    @PutMapping("/conversations/{conversationId}/read")
    public ApiResponse<Void> markRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long conversationId
    ) {
        chatService.markConversationRead(userDetails.getUser().getId(), roles(userDetails), conversationId);
        return ApiResponse.success(null);
    }

    @PostMapping("/pois/{poiId}/private-conversation")
    public ApiResponse<ChatConversationSummaryResponse> openPoiConversation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poiId
    ) {
        return ApiResponse.success(chatService.openPoiPrivateConversation(userDetails.getUser().getId(), roles(userDetails), poiId));
    }

    @GetMapping("/pois/{poiId}/messages")
    public ApiResponse<List<ChatMessageResponse>> listPoiCommunicationMessages(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long poiId
    ) {
        return ApiResponse.success(chatService.listPoiCommunicationMessages(userDetails.getUser().getId(), roles(userDetails), poiId));
    }

    private List<String> roles(CustomUserDetails userDetails) {
        return userDetails.getUser().getRoles().stream().map(role -> role.getCode()).toList();
    }
}
