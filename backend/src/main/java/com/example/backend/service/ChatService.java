package com.example.backend.service;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.dto.response.ConversationResponse;
import com.example.backend.enums.ConversationType;
import java.util.List;

public interface ChatService {

    ChatMessageResponse saveMessage(Long userId, Long hotelId, Long bookingId, String senderEmail, String content, ConversationType type);

    List<ConversationResponse> getUserInbox(String userEmail); 

    List<ConversationResponse> getHotelInbox(Long hotelId, String currentUserEmail); 
    
    List<ConversationResponse> getAdminInbox();
    
    List<ChatMessageResponse> getChatHistory(Long conversationId);

    void markAsRead(Long conversationId, String readerEmail, String senderEmail);
}