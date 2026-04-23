package com.example.backend.dto.request;
import lombok.Data;

@Data
public class ChatReadRequest {
    private Long conversationId;
    private String senderEmail;
}