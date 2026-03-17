package com.example.backend.service.impl;

import com.example.backend.dto.request.RoomImageRequest;
import com.example.backend.dto.response.RoomImageResponse;
import com.example.backend.entity.RoomImage;
import com.example.backend.entity.RoomType;
import com.example.backend.mapper.RoomImageMapper;
import com.example.backend.repository.RoomImageRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.RoomImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomImageServiceImpl implements RoomImageService {

    private final RoomImageRepository roomImageRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomImageMapper roomImageMapper;

    @Override
    public List<RoomImageResponse> getAllRoomImages() {
        return roomImageRepository.findAll()
                .stream()
                .map(roomImageMapper::toRoomImageResponse)
                .collect(Collectors.toList());
    }

    @Override
    public RoomImageResponse getRoomImageById(Long id) {
        return roomImageRepository.findById(id)
                .map(roomImageMapper::toRoomImageResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "RoomImage not found id=" + id
                ));
    }

    @Override
    public RoomImageResponse createRoomImage(RoomImageRequest request) {

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "RoomType not found id=" + request.getRoomTypeId()
                ));

        RoomImage saved = roomImageRepository.save(
                roomImageMapper.toRoomImage(request, roomType)
        );

        return roomImageMapper.toRoomImageResponse(saved);
    }

    @Override
    public RoomImageResponse updateRoomImage(Long id, RoomImageRequest request) {

        RoomImage existing = roomImageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "RoomImage not found id=" + id
                ));

        if (request.getRoomTypeId() != null) {
            RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "RoomType not found id=" + request.getRoomTypeId()
                    ));
            existing.setRoomType(roomType);
        }

        if (request.getImageUrl() != null) {
            existing.setImageUrl(request.getImageUrl());
        }

        if (request.getIsPrimary() != null) {
            existing.setIsPrimary(request.getIsPrimary());
        }

        return roomImageMapper.toRoomImageResponse(
                roomImageRepository.save(existing)
        );
    }

    @Override
    public void deleteRoomImage(Long id) {

        RoomImage existing = roomImageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "RoomImage not found id=" + id
                ));

        roomImageRepository.delete(existing);
    }
}