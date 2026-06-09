package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class DailyStatisticResponse {
    
    private LocalDate statDate;
    private Long completedBookings;
    private Long totalCancelled;
    private Long totalNoShow;

    private BigDecimal grossRevenue;
    private BigDecimal totalCommission;
    private BigDecimal netRevenue;
    private BigDecimal systemSponsorAmount;
    private BigDecimal platformNetProfit;
}