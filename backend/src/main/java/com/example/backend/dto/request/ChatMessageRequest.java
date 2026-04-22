package com.example.backend.dto.request;
import lombok.Data;

@Data
public class ChatMessageRequest {
    private Long userId;
    private Long hotelId;
    private String content;
    private String receiverEmail;
}