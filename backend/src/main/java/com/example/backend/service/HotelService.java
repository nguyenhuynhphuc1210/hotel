package com.example.backend.service;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelAdminResponse;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.dto.response.HotelSummaryResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface HotelService {
    List<HotelSummaryResponse> getActiveHotels();
    List<HotelAdminResponse> getAllHotels();
    HotelResponse getHotelById(Long id);
    HotelResponse createHotel(HotelRequest request);
    HotelResponse updateHotel(Long id, HotelRequest request);
    void deleteHotel(Long id);
    HotelResponse restoreHotel(Long id);
    HotelResponse approveHotel(Long id);
    HotelResponse disableHotel(Long id);
    BigDecimal getMinPriceForHotel(Long hotelId, LocalDate checkIn, LocalDate checkOut);
    List<HotelSummaryResponse> searchHotels(String district, String keyword, LocalDate checkIn, LocalDate checkOut, Integer guests);
}
