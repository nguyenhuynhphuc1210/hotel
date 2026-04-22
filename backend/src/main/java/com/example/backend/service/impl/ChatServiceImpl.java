package com.example.backend.service.impl;

import com.example.backend.entity.ChatMessage;
import com.example.backend.entity.Conversation;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
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

    @Override
    @Transactional
    public ChatMessage saveMessage(Long userId, Long hotelId, String senderEmail, String content) {
        
        Conversation conversation = conversationRepository.findByUser_IdAndHotel_Id(userId, hotelId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("Không tìm thấy User"));
                    Hotel hotel = hotelRepository.findById(hotelId)
                            .orElseThrow(() -> new RuntimeException("Không tìm thấy Hotel"));
                    
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

        return chatMessageRepository.save(message);
    }

    // --- CÁC HÀM MỚI ĐỂ LẤY DỮ LIỆU INBOX & LỊCH SỬ ---

    @Override
    @Transactional(readOnly = true)
    public List<Conversation> getUserInbox(Long userId) {
        // Trả về danh sách đoạn chat, tin nhắn mới nhất xếp lên đầu
        return conversationRepository.findByUser_IdOrderByLastMessageAtDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Conversation> getHotelInbox(Long hotelId) {
        // Trả về danh sách đoạn chat cho chủ KS, tin nhắn mới nhất xếp lên đầu
        return conversationRepository.findByHotel_IdOrderByLastMessageAtDesc(hotelId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessage> getChatHistory(Long conversationId) {
        // Trả về danh sách tin nhắn của 1 phòng chat, xếp từ cũ đến mới (trên xuống dưới)
        return chatMessageRepository.findByConversation_IdOrderByTimestampAsc(conversationId);
    }
}