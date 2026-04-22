package com.example.backend.controller;

import com.example.backend.dto.request.ChatMessageRequest;
import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.entity.ChatMessage;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import com.example.backend.mapper.ChatMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.ChatService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final ChatMapper chatMapper; 


    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {

        String senderEmail = principal.getName(); 

        ChatMessage savedMsg = chatService.saveMessage(
                request.getUserId(), 
                request.getHotelId(), 
                senderEmail, 
                request.getContent()
        );

        ChatMessageResponse responsePayload = chatMapper.toResponse(savedMsg);

        messagingTemplate.convertAndSendToUser(
                request.getReceiverEmail(), 
                "/queue/messages", 
                responsePayload
        );
    }

    @GetMapping("/api/chat/user-inbox")
    @PreAuthorize("hasAnyRole('USER', 'HOTEL_OWNER')")
    public ResponseEntity<?> getUserInbox() {
        String currentUserEmail = SecurityUtils.getCurrentUserEmail();
        User user = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        return ResponseEntity.ok(chatService.getUserInbox(user.getId()));
    }

    @GetMapping("/api/chat/hotel-inbox/{hotelId}")
    @PreAuthorize("hasRole('HOTEL_OWNER')")
    public ResponseEntity<?> getHotelInbox(@PathVariable Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        SecurityUtils.checkOwnerOrAdmin(hotel.getOwner().getEmail());

        return ResponseEntity.ok(chatService.getHotelInbox(hotelId));
    }

    @GetMapping("/api/chat/history/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getChatHistory(@PathVariable Long conversationId) {

        List<ChatMessage> historyList = chatService.getChatHistory(conversationId);

        return ResponseEntity.ok(chatMapper.toResponseList(historyList));
    }
}