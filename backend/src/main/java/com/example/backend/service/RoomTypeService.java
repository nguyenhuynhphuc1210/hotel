package com.example.backend.service;

import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse;

import java.util.List;

public interface RoomTypeService {
    List<RoomTypeSummaryResponse> getAllRoomTypes();
    List<RoomTypeSummaryResponse> getActiveRoomTypes();
    List<RoomTypeSummaryResponse> getActiveRoomTypesByHotel(Long hotelId);
    RoomTypeResponse getRoomTypeById(Long id);
    RoomTypeResponse createRoomType(RoomTypeRequest request);
    RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request);
    void deleteRoomType(Long id);
}
