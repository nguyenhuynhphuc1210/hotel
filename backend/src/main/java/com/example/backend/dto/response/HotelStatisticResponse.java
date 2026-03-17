package com.example.backend.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelStatisticResponse {
    private Long id;
    private Long hotelId;
    private LocalDate statDate;
    private Integer totalBookings;
    private BigDecimal totalRevenue;
}