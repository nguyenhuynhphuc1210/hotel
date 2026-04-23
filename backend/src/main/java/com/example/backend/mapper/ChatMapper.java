package com.example.backend.mapper;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.dto.response.ConversationResponse;
import com.example.backend.entity.ChatMessage;
import com.example.backend.entity.Conversation;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ChatMapper {

    public ChatMessageResponse toResponse(ChatMessage entity) {
        if (entity == null) {
            return null;
        }
        
        return ChatMessageResponse.builder()
                .id(entity.getId())
                .conversationId(entity.getConversation().getId())
                .senderEmail(entity.getSenderEmail())
                .content(entity.getContent())
                .timestamp(entity.getTimestamp())
                .build();
    }

    public List<ChatMessageResponse> toResponseList(List<ChatMessage> entities) {
        return entities.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ConversationResponse toConversationResponse(Conversation entity) {
        if (entity == null) return null;
        
        return ConversationResponse.builder()
                .id(entity.getId())
                .hotelId(entity.getHotel().getId())
                .hotelName(entity.getHotel().getHotelName())
                .userId(entity.getUser().getId())
                .userFullName(entity.getUser().getFullName())
                .userEmail(entity.getUser().getEmail())
                .userAvatar(entity.getUser().getAvatarUrl())
                .lastMessageAt(entity.getLastMessageAt())
                .build();
    }

    public List<ConversationResponse> toConversationResponseList(List<Conversation> entities) {
        return entities.stream()
                .map(this::toConversationResponse)
                .collect(Collectors.toList());
    }
}