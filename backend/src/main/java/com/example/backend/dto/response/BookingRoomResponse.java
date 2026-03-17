package com.example.backend.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingRoomResponse {
    private Long id;
    private Long bookingId;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer quantity;
    private BigDecimal pricePerNight;
}