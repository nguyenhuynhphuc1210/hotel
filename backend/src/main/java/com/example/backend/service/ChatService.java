package com.example.backend.service;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.dto.response.ConversationResponse;
import java.util.List;

public interface ChatService {
    ChatMessageResponse saveMessage(Long userId, Long hotelId, String senderEmail, String content);

    List<ConversationResponse> getUserInbox(String userEmail); 

    List<ConversationResponse> getHotelInbox(Long hotelId, String currentUserEmail); 
    
    List<ChatMessageResponse> getChatHistory(Long conversationId);

    void markAsRead(Long conversationId, String readerEmail, String senderEmail);
}