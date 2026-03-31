package com.example.backend.mapper;

import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse;
import com.example.backend.dto.response.RoomImageResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.RoomType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RoomTypeMapper {

    private final RoomImageMapper roomImageMapper;

    public RoomType toRoomType(RoomTypeRequest req, Hotel hotel) {
        if (req == null) return null;
        return RoomType.builder()
                .hotel(hotel)
                .typeName(req.getTypeName())
                .description(req.getDescription())
                .maxAdults(req.getMaxAdults() != null ? req.getMaxAdults() : 2)
                .maxChildren(req.getMaxChildren() != null ? req.getMaxChildren() : 1)
                .bedType(req.getBedType())
                .roomSize(req.getRoomSize())
                .basePrice(req.getBasePrice())
                .totalRooms(req.getTotalRooms())
                .isActive(true)
                .build();
    }

    public RoomTypeResponse toRoomTypeResponse(RoomType rt) {
        if (rt == null) return null;
        
        List<RoomImageResponse> images = rt.getImages() == null 
                ? Collections.emptyList() 
                : rt.getImages().stream().map(roomImageMapper::toRoomImageResponse).collect(Collectors.toList());
        
        return RoomTypeResponse.builder()
                .id(rt.getId())
                .hotelId(rt.getHotel() != null ? rt.getHotel().getId() : null)
                .hotelName(rt.getHotel() != null ? rt.getHotel().getHotelName() : null)
                .typeName(rt.getTypeName())
                .description(rt.getDescription())
                .maxAdults(rt.getMaxAdults())
                .maxChildren(rt.getMaxChildren())
                .bedType(rt.getBedType())
                .roomSize(rt.getRoomSize())
                .basePrice(rt.getBasePrice())
                .totalRooms(rt.getTotalRooms())
                .isActive(rt.getIsActive())
                .createdAt(rt.getCreatedAt())
                .updatedAt(rt.getUpdatedAt())
                .images(images)
                .build();
    }

    public RoomTypeSummaryResponse toRoomTypeSummaryResponse(RoomType rt) {
        if (rt == null) return null;

        String thumbnail = null;
        if (rt.getImages() != null && !rt.getImages().isEmpty()) {
            thumbnail = rt.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .map(img -> img.getImageUrl())
                    .orElseGet(() -> rt.getImages().get(0).getImageUrl());
        }

        return RoomTypeSummaryResponse.builder()
                .id(rt.getId())
                .typeName(rt.getTypeName())
                .maxAdults(rt.getMaxAdults())
                .maxChildren(rt.getMaxChildren())
                .bedType(rt.getBedType())
                .roomSize(rt.getRoomSize())
                .basePrice(rt.getBasePrice())
                .totalRooms(rt.getTotalRooms())
                .isActive(rt.getIsActive())
                .thumbnailUrl(thumbnail)
                .build();
    }
}