package com.example.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long conversationId;
    private String senderEmail;
    private String content;
    private LocalDateTime timestamp;
    private String clientMessageId;
}