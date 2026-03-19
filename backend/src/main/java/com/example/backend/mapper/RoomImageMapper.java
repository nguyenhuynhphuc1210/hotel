package com.example.backend.mapper;

import com.example.backend.dto.request.RoomImageRequest;
import com.example.backend.dto.response.RoomImageResponse;
import com.example.backend.entity.RoomImage;
import com.example.backend.entity.RoomType;
import org.springframework.stereotype.Component;

@Component
public class RoomImageMapper {
    public RoomImage toRoomImage(RoomImageRequest req, RoomType roomType) {
        if (req == null) return null;
        return RoomImage.builder()
                .roomType(roomType)
                .imageUrl(req.getImageUrl())
                .isPrimary(req.getIsPrimary() != null ? req.getIsPrimary() : false)
                .build();
    }

    public RoomImageResponse toRoomImageResponse(RoomImage roomImage) {
        if (roomImage == null) return null;
        return RoomImageResponse.builder()
                .id(roomImage.getId())
                .roomTypeId(roomImage.getRoomType() != null ? roomImage.getRoomType().getId() : null)
                .roomTypeName(roomImage.getRoomType() != null ? roomImage.getRoomType().getTypeName() : null)
                .imageUrl(roomImage.getImageUrl())
                .publicId(roomImage.getPublicId())
                .isPrimary(roomImage.getIsPrimary())
                .build();
    }
}
