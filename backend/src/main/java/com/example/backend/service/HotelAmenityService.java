package com.example.backend.service;

import com.example.backend.dto.request.HotelAmenityRequest;
import com.example.backend.dto.response.HotelAmenityResponse;

import java.util.List;

public interface HotelAmenityService {

    HotelAmenityResponse create(HotelAmenityRequest request);

    List<HotelAmenityResponse> getAll();

    HotelAmenityResponse getById(Long hotelId, Long amenityId);

    List<HotelAmenityResponse> getByHotel(Long hotelId);

    HotelAmenityResponse update(HotelAmenityRequest request);

    void delete(Long hotelId, Long amenityId);
}