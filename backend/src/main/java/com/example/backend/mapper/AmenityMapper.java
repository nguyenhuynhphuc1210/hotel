package com.example.backend.mapper;

import com.example.backend.dto.request.AmenityRequest;
import com.example.backend.dto.response.AmenityResponse;
import com.example.backend.entity.Amenity;
import org.springframework.stereotype.Component;

@Component
public class AmenityMapper {
    public Amenity toAmenity(AmenityRequest req) {
        if (req == null) return null;
        return Amenity.builder()
                .amenityName(req.getAmenityName())
                .iconUrl(req.getIconUrl())
                .build();
    }

    public AmenityResponse toAmenityResponse(Amenity a) {
        if (a == null) return null;
        return AmenityResponse.builder()
                .id(a.getId())
                .amenityName(a.getAmenityName())
                .iconUrl(a.getIconUrl())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
