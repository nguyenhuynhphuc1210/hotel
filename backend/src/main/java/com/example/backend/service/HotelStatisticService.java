package com.example.backend.service;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.enums.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface HotelStatisticService {

    List<HotelStatisticResponse> getStatistics(HotelStatisticRequest request);

    void recordRealtimeStatistic(Hotel hotel, BigDecimal totalAmount, LocalDate date, BookingStatus status);
}