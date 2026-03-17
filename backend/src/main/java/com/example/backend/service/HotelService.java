package com.example.backend.service;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelResponse;

import java.util.List;

public interface HotelService {
    List<HotelResponse> getAllHotels();
    HotelResponse getHotelById(Long id);
    HotelResponse createHotel(HotelRequest request);
    HotelResponse updateHotel(Long id, HotelRequest request);
    void deleteHotel(Long id);
    HotelResponse approveHotel(Long id);
    HotelResponse disableHotel(Long id);
}
