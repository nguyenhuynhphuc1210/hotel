package com.example.backend.mapper;

import com.example.backend.dto.request.HotelAmenityRequest;
import com.example.backend.dto.response.HotelAmenityResponse;
import com.example.backend.entity.Amenity;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelAmenity;
import org.springframework.stereotype.Component;

@Component
public class HotelAmenityMapper {
    public HotelAmenity toHotelAmenity(HotelAmenityRequest req, Hotel hotel, Amenity amenity) {
        if (req == null) return null;
        return HotelAmenity.builder()
                .hotel(hotel)
                .amenity(amenity)
                .isFree(req.getIsFree() != null ? req.getIsFree() : true)
                .additionalFee(req.getAdditionalFee())
                .build();
    }

    public HotelAmenityResponse toHotelAmenityResponse(HotelAmenity h) {
        if (h == null) return null;
        return HotelAmenityResponse.builder()
                .hotelId(h.getHotel() != null ? h.getHotel().getId() : null)
                .hotelName(h.getHotel() != null ? h.getHotel().getHotelName() : null)
                .amenityId(h.getAmenity() != null ? h.getAmenity().getId() : null)
                .amenityName(h.getAmenity() != null ? h.getAmenity().getAmenityName() : null)
                .isFree(h.getIsFree())
                .additionalFee(h.getAdditionalFee())
                .build();
    }
}
