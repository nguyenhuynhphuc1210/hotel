package com.example.backend.service;

import com.example.backend.dto.request.RoomImageRequest;
import com.example.backend.dto.response.RoomImageResponse;

import java.util.List;

public interface RoomImageService {

    List<RoomImageResponse> getAllRoomImages();

    RoomImageResponse getRoomImageById(Long id);

    RoomImageResponse createRoomImage(RoomImageRequest request);

    RoomImageResponse updateRoomImage(Long id, RoomImageRequest request);

    void deleteRoomImage(Long id);
}