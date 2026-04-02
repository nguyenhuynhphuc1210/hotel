package com.example.backend.service;

import com.example.backend.dto.request.RoomTypeAmenityRequest;
import com.example.backend.dto.response.RoomTypeAmenityResponse;


import java.util.List;

public interface RoomTypeAmenityService {

    List<RoomTypeAmenityResponse> getAll();

    RoomTypeAmenityResponse getById(Long roomTypeId, Long amenityId);

    List<RoomTypeAmenityResponse> getByRoomType(Long roomTypeId);

    RoomTypeAmenityResponse create(RoomTypeAmenityRequest request);

    RoomTypeAmenityResponse update(RoomTypeAmenityRequest request);

    void delete(Long roomTypeId, Long amenityId);
}