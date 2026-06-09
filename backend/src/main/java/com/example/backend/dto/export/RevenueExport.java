package com.example.backend.dto.export;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueExport {

    private String hotelName;
    private LocalDate statDate;
    private Integer completedBookings;
    private Integer totalCancelled;
    private Integer totalNoShow;

    private BigDecimal grossRevenue;
    private BigDecimal totalCommission;
    private BigDecimal systemSponsorAmount;

    private BigDecimal platformNetProfit;
    private BigDecimal netRevenue;
}