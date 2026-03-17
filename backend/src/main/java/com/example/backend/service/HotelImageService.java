package com.example.backend.service;

import com.example.backend.dto.request.HotelImageRequest;
import com.example.backend.dto.response.HotelImageResponse;

import java.util.List;

public interface HotelImageService {
    List<HotelImageResponse> getAllHotelImages();
    HotelImageResponse getHotelImageById(Long id);
    HotelImageResponse createHotelImage(HotelImageRequest request);
    HotelImageResponse updateHotelImage(Long id, HotelImageRequest request);
    void deleteHotelImage(Long id);
}