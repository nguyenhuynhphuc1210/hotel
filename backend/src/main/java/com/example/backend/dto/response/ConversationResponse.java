package com.example.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ConversationResponse {
    private Long id;
    private Long hotelId;
    private String hotelName;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private String userAvatar;
    private Long bookingId;
    private LocalDateTime lastMessageAt;
}