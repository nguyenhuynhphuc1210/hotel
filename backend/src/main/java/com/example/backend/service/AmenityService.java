package com.example.backend.service;

import com.example.backend.dto.request.AmenityRequest;
import com.example.backend.dto.response.AmenityResponse;

import java.util.List;

public interface AmenityService {
    List<AmenityResponse> getAllAmenities();
    AmenityResponse getAmenityById(Long id);
    AmenityResponse createAmenity(AmenityRequest request);
    AmenityResponse updateAmenity(Long id, AmenityRequest request);
    void deleteAmenity(Long id);
}
