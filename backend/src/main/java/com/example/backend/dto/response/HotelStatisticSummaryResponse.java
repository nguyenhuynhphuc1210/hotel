package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class HotelStatisticSummaryResponse {
    
    private Long hotelId;
    private String hotelName;
    private Long completedBookings;
    private Long totalCancelled;
    private Long totalNoShow;

    private BigDecimal grossRevenue;
    private BigDecimal totalCommission;
    private BigDecimal netRevenue;
}