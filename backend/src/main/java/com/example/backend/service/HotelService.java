package com.example.backend.service;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.dto.response.HotelSummaryResponse;

import java.time.LocalDate;
import java.util.List;

public interface HotelService {
    List<HotelSummaryResponse> getActiveHotels();
    List<HotelSummaryResponse> getAllHotels();
    HotelResponse getHotelById(Long id);
    HotelResponse createHotel(HotelRequest request);
    HotelResponse updateHotel(Long id, HotelRequest request);
    void deleteHotel(Long id);
    HotelResponse approveHotel(Long id);
    HotelResponse disableHotel(Long id);
    List<HotelSummaryResponse> searchHotels(String district, String keyword, LocalDate checkIn, LocalDate checkOut, Integer guests);
}
