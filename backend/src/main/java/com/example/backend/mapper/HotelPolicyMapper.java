package com.example.backend.mapper;

import com.example.backend.dto.request.HotelPolicyRequest;
import com.example.backend.dto.response.HotelPolicyResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelPolicy;
import org.springframework.stereotype.Component;

@Component
public class HotelPolicyMapper {
    public HotelPolicy toHotelPolicy(HotelPolicyRequest req, Hotel hotel) {
        if (req == null) return null;
        return HotelPolicy.builder()
                .hotel(hotel)
                .checkInTime(req.getCheckInTime())
                .checkOutTime(req.getCheckOutTime())
                .cancellationPolicy(req.getCancellationPolicy())
                .childrenPolicy(req.getChildrenPolicy())
                .petPolicy(req.getPetPolicy())
                .build();
    }

    public HotelPolicyResponse toHotelPolicyResponse(HotelPolicy p) {
        if (p == null) return null;
        return HotelPolicyResponse.builder()
                .id(p.getId())
                .hotelId(p.getHotel() != null ? p.getHotel().getId() : null)
                .checkInTime(p.getCheckInTime())
                .checkOutTime(p.getCheckOutTime())
                .cancellationPolicy(p.getCancellationPolicy())
                .childrenPolicy(p.getChildrenPolicy())
                .petPolicy(p.getPetPolicy())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
