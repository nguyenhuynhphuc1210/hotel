package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

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
    private List<BookingRoomRateResponse> rates;
}