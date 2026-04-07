package com.example.backend.mapper;

import com.example.backend.dto.request.HotelImageRequest;
import com.example.backend.dto.response.HotelImageResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelImage;
import org.springframework.stereotype.Component;

@Component
public class HotelImageMapper {
    public HotelImage toHotelImage(HotelImageRequest req, Hotel hotel) {
        if (req == null) return null;
        return HotelImage.builder()
                .hotel(hotel)
                .imageUrl(req.getImageUrl())
                .isPrimary(req.getIsPrimary() != null ? req.getIsPrimary() : false)
                .build();
    }

    public HotelImageResponse toHotelImageResponse(HotelImage image) {
        if (image == null) return null;
        return HotelImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .publicId(image.getPublicId())
                .isPrimary(image.getIsPrimary())
                .build();
    }
}
