package com.example.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteResponse {
    private HotelSummaryResponse hotel;
    private LocalDateTime createdAt;
}