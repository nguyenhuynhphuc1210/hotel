package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {

    private Long completedBookings;

    private Long totalCancelled;

    private Long totalNoShow;

    private BigDecimal grossRevenue;
    private BigDecimal totalCommission;
    private BigDecimal netRevenue;
}