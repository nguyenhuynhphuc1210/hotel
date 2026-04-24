package com.example.backend.controller;

import com.example.backend.dto.request.ChatMessageRequest;
import com.example.backend.dto.request.ChatReadRequest;
import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.ChatService;
import com.example.backend.service.GeminiService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

import java.security.Principal;


@Slf4j
@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final GeminiService geminiService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        ChatMessageResponse responsePayload = chatService.saveMessage(
                request.getUserId(),
                request.getHotelId(),
                request.getBookingId(),
                principal.getName(),
                request.getContent());

        messagingTemplate.convertAndSendToUser(
                request.getReceiverEmail(),
                "/queue/messages",
                responsePayload);

        messagingTemplate.convertAndSendToUser(
                principal.getName(), 
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
        String currentUserEmail = SecurityUtils.getCurrentUserEmail();
        return ResponseEntity.ok(chatService.getHotelInbox(hotelId, currentUserEmail));
    }

    @GetMapping("/api/chat/history/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getChatHistory(@PathVariable Long conversationId) {
        return ResponseEntity.ok(chatService.getChatHistory(conversationId));
    }

    @MessageMapping("/chat.read")
    public void markAsRead(@Payload ChatReadRequest request, Principal principal) {
        chatService.markAsRead(
                request.getConversationId(), 
                principal.getName(),
                request.getSenderEmail()
        );
    }

    @PostMapping("/api/chat/ai")
    public ResponseEntity<?> chatWithAI(@RequestBody Map<String, Object> request) {
        Long hotelId = null;

        Object hotelIdObj = request.get("hotelId");

        if (hotelIdObj != null 
            && !hotelIdObj.toString().trim().isEmpty() 
            && !"null".equalsIgnoreCase(hotelIdObj.toString())) {
            
            hotelId = Long.valueOf(hotelIdObj.toString());
        }

        String prompt = request.getOrDefault("prompt", "").toString();

        String aiReply = geminiService.askGemini(hotelId, prompt);
        
        return ResponseEntity.ok(Map.of("reply", aiReply));
    }
}