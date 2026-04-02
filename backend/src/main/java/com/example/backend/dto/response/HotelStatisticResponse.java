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
    private Integer totalCancelled;
    private Integer totalNoShow;
    private BigDecimal totalRevenue;
    public Integer getGrossBookings() {
        int completed = (this.totalBookings != null) ? this.totalBookings : 0;
        int cancelled = (this.totalCancelled != null) ? this.totalCancelled : 0;
        int noShow = (this.totalNoShow != null) ? this.totalNoShow : 0;
        return completed + cancelled + noShow;
    }
}