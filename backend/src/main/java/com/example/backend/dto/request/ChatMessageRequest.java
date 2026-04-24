package com.example.backend.dto.request;
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
}