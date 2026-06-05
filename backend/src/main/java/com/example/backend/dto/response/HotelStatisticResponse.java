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
    private Integer completedBookings;
    private Integer totalCancelled;
    private Integer totalNoShow;

    private BigDecimal grossRevenue;
    private BigDecimal totalCommission;
    private BigDecimal netRevenue;
}