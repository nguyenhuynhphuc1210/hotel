package com.example.backend.service;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.DashboardResponse;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.enums.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.io.IOException;

public interface HotelStatisticService {

        List<HotelStatisticResponse> getStatistics(HotelStatisticRequest request);

        void recordRealtimeStatistic(Hotel hotel, BigDecimal grossAmount, BigDecimal commissionAmount, BigDecimal netAmount, LocalDate date, BookingStatus status);

        byte[] exportRevenueToExcel(
                        Long hotelId,
                        Long ownerId,
                        Integer month,
                        Integer year,
                        LocalDate fromDate,
                        LocalDate toDate) throws IOException;

        DashboardResponse getDashboardData(Long hotelId, Long ownerId, Integer month, Integer year, LocalDate fromDate,
                        LocalDate toDate);
}