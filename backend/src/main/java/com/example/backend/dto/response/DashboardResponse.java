package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardResponse {

    private DashboardSummaryResponse summary;

    private Long totalHotels;

    private Long totalUsers;

    private Long totalBookings;

    private List<DailyStatisticResponse> chartData;

    private List<HotelStatisticSummaryResponse> topHotels;

    private List<RecentBookingResponse> recentBookings;

}