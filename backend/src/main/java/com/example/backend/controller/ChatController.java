package com.example.backend.controller;

import com.example.backend.dto.request.ChatMessageRequest;
import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        ChatMessageResponse responsePayload = chatService.saveMessage(
                request.getUserId(),
                request.getHotelId(),
                principal.getName(),
                request.getContent());

        messagingTemplate.convertAndSendToUser(
                request.getReceiverEmail(),
                "/queue/messages",
                responsePayload);
    }

    @GetMapping("/api/chat/user-inbox")
    @PreAuthorize("hasAnyRole('USER', 'HOTEL_OWNER')")
    public ResponseEntity<?> getUserInbox() {
        String currentUserEmail = SecurityUtils.getCurrentUserEmail();
        return ResponseEntity.ok(chatService.getUserInbox(currentUserEmail));
    }

    @GetMapping("/api/chat/hotel-inbox/{hotelId}")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ResponseEntity<?> getHotelInbox(@PathVariable Long hotelId) {
        // Controller chỉ truyền tham số cần thiết xuống Service
        String currentUserEmail = SecurityUtils.getCurrentUserEmail();
        return ResponseEntity.ok(chatService.getHotelInbox(hotelId, currentUserEmail));
    }

    @GetMapping("/api/chat/history/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getChatHistory(@PathVariable Long conversationId) {
        return ResponseEntity.ok(chatService.getChatHistory(conversationId));
    }
}