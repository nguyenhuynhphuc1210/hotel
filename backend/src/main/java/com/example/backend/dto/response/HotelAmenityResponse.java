package com.example.backend.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelAmenityResponse {
    private Long hotelId;
    private String hotelName;
    private Long amenityId;
    private String amenityName;
    private Boolean isFree;
    private BigDecimal additionalFee;
}