package com.example.backend.mapper;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.entity.ChatMessage;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ChatMapper {

    // Chuyển 1 Entity sang DTO
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

    // Chuyển 1 Danh sách Entity sang Danh sách DTO (Dùng cho API Lịch sử chat)
    public List<ChatMessageResponse> toResponseList(List<ChatMessage> entities) {
        return entities.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}