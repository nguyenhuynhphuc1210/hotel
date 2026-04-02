package com.example.backend.mapper;

import com.example.backend.dto.request.RoomTypeAmenityRequest;
import com.example.backend.dto.response.RoomTypeAmenityResponse;
import com.example.backend.entity.Amenity;
import com.example.backend.entity.RoomType;
import com.example.backend.entity.RoomTypeAmenity;
import org.springframework.stereotype.Component;

@Component
public class RoomTypeAmenityMapper {

    public RoomTypeAmenity toEntity(RoomTypeAmenityRequest request, RoomType roomType, Amenity amenity) {
        if (request == null) {
            return null;
        }

        return RoomTypeAmenity.builder()
                .roomType(roomType)
                .amenity(amenity)
                .isFree(request.getIsFree())
                .additionalFee(request.getAdditionalFee())
                .build();
    }

    public RoomTypeAmenityResponse toResponse(RoomTypeAmenity entity) {
        if (entity == null) {
            return null;
        }

        return RoomTypeAmenityResponse.builder()
                .roomTypeId(entity.getRoomType() != null ? entity.getRoomType().getId() : null)
                .roomTypeName(entity.getRoomType() != null ? entity.getRoomType().getTypeName() : null)

                .amenityId(entity.getAmenity() != null ? entity.getAmenity().getId() : null)
                .amenityName(entity.getAmenity() != null ? entity.getAmenity().getAmenityName() : null)
                .iconUrl(entity.getAmenity() != null ? entity.getAmenity().getIconUrl() : null)

                .isFree(entity.getIsFree())
                .additionalFee(entity.getAdditionalFee())
                .build();
    }
}