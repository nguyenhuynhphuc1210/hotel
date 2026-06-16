package com.example.backend.dto.request;

import com.example.backend.enums.ConversationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    private Long userId;
    private Long hotelId;
    private Long bookingId;
    private String content;
    private String receiverEmail;
    private ConversationType type;
}