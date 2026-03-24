package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelSummaryResponse {
    private Long id;
    private String hotelName;
    private BigDecimal starRating;
    private String district;
    private String city;
    private Boolean isActive;

    private String thumbnailUrl; 
}