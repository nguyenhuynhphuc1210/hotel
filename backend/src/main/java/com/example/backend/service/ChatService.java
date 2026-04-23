package com.example.backend.service;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.dto.response.ConversationResponse;
import java.util.List;

public interface ChatService {
    ChatMessageResponse saveMessage(Long userId, Long hotelId, String senderEmail, String content);
    
    // Đổi tham số thành String userEmail thay vì Long userId
    List<ConversationResponse> getUserInbox(String userEmail); 
    
    // Đổi tham số thành Long hotelId và thêm String currentUserEmail để check quyền
    List<ConversationResponse> getHotelInbox(Long hotelId, String currentUserEmail); 
    
    List<ChatMessageResponse> getChatHistory(Long conversationId);
}