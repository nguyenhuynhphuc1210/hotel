package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingRoomRateResponse {
    private Long id;
    private Long bookingRoomId;
    private Long roomTypeId;
    private LocalDate date;
    private BigDecimal price;
}