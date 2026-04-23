package com.example.backend.service.impl;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.dto.response.ConversationResponse;
import com.example.backend.entity.ChatMessage;
import com.example.backend.entity.Conversation;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import com.example.backend.mapper.ChatMapper;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.ChatService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final ChatMapper chatMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public ChatMessageResponse saveMessage(Long userId, Long hotelId, String senderEmail, String content) {
        Conversation conversation = conversationRepository.findByUser_IdAndHotel_Id(userId, hotelId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy User"));
                    Hotel hotel = hotelRepository.findById(hotelId)
                            .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy Hotel"));

                    Conversation newConv = Conversation.builder()
                            .user(user)
                            .hotel(hotel)
                            .build();
                    return conversationRepository.save(newConv);
                });

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        ChatMessage message = ChatMessage.builder()
                .conversation(conversation)
                .senderEmail(senderEmail)
                .content(content)
                .timestamp(LocalDateTime.now())
                .isRead(false)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        return chatMapper.toResponse(savedMessage);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getUserInbox(String userEmail) {
        Long userId = userRepository.findIdByEmail(userEmail);
        if (userId == null) {
            throw new EntityNotFoundException("Không tìm thấy người dùng");
        }

        List<Conversation> inbox = conversationRepository.findByUser_IdOrderByLastMessageAtDesc(userId);
        return chatMapper.toConversationResponseList(inbox);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getHotelInbox(Long hotelId, String currentUserEmail) {
        String ownerEmail = hotelRepository.findOwnerEmailByHotelId(hotelId);
        if (ownerEmail == null) {
            throw new EntityNotFoundException("Không tìm thấy khách sạn");
        }

        SecurityUtils.checkOwnerOrAdmin(ownerEmail);

        List<Conversation> inbox = conversationRepository.findByHotel_IdOrderByLastMessageAtDesc(hotelId);
        return chatMapper.toConversationResponseList(inbox);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatHistory(Long conversationId) {
        List<ChatMessage> history = chatMessageRepository.findByConversation_IdOrderByTimestampAsc(conversationId);
        return chatMapper.toResponseList(history);
    }

    @Override
    @Transactional
    public void markAsRead(Long conversationId, String readerEmail, String senderEmail) {

        chatMessageRepository.markMessagesAsRead(conversationId, readerEmail);

        messagingTemplate.convertAndSendToUser(
                senderEmail, 
                "/queue/read", 
                conversationId
        );
    }
}