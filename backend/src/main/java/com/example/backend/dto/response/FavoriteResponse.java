package com.example.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteResponse {
    private Long userId;
    private String userEmail;
    private Long hotelId;
    private String hotelName;
    private LocalDateTime createdAt;
}