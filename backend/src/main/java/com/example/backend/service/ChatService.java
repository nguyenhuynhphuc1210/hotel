package com.example.backend.service;

import com.example.backend.entity.ChatMessage;
import com.example.backend.entity.Conversation;

import java.util.List;

public interface ChatService {

    ChatMessage saveMessage(Long userId, Long hotelId, String senderEmail, String content);

    List<Conversation> getUserInbox(Long userId);

    List<Conversation> getHotelInbox(Long hotelId);

    List<ChatMessage> getChatHistory(Long conversationId);
}