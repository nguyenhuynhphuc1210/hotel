package com.example.backend.mapper;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.dto.response.HotelSummaryResponse;
import com.example.backend.dto.response.HotelAdminResponse;
import com.example.backend.dto.response.HotelImageResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class HotelMapper {

    private final HotelImageMapper hotelImageMapper;

    public Hotel toHotel(HotelRequest req, User owner) {
        if (req == null)
            return null;
            
        return Hotel.builder()
                .hotelName(req.getHotelName())
                .description(req.getDescription())

                .addressLine(req.getAddressLine())
                .ward(req.getWard())
                .district(req.getDistrict())
                .city(req.getCity() != null ? req.getCity() : "TP Hồ Chí Minh")
                .phone(req.getPhone())
                .email(req.getEmail())
                .owner(owner)

                .build();
    }

    public HotelResponse toHotelResponse(Hotel hotel) {
        if (hotel == null)
            return null;

        List<HotelImageResponse> imageResponses = hotel.getImages() == null
                ? Collections.emptyList()
                : hotel.getImages().stream().map(hotelImageMapper::toHotelImageResponse).collect(Collectors.toList());

        return HotelResponse.builder()
                .id(hotel.getId())
                .hotelName(hotel.getHotelName())
                .description(hotel.getDescription())
                .starRating(hotel.getStarRating())
                .addressLine(hotel.getAddressLine())
                .ward(hotel.getWard())
                .district(hotel.getDistrict())
                .city(hotel.getCity())
                .phone(hotel.getPhone())
                .email(hotel.getEmail())
                .ownerId(hotel.getOwner() != null ? hotel.getOwner().getId() : null)
                .ownerName(hotel.getOwner() != null ? hotel.getOwner().getFullName() : null)
                .ownerEmail(hotel.getOwner() != null ? hotel.getOwner().getEmail() : null)
                .status(hotel.getStatus())
                .statusReason(hotel.getStatusReason())
                .deletedAt(hotel.getDeletedAt())
                
                .createdAt(hotel.getCreatedAt())
                .updatedAt(hotel.getUpdatedAt())
                .images(imageResponses)
                .build();
    }

    public HotelSummaryResponse toHotelSummaryResponse(Hotel hotel) {
        if (hotel == null)
            return null;

        String thumbnail = null;
        if (hotel.getImages() != null && !hotel.getImages().isEmpty()) {
            thumbnail = hotel.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .map(img -> img.getImageUrl())
                    .orElseGet(() -> hotel.getImages().get(0).getImageUrl());
        }

        return HotelSummaryResponse.builder()
                .id(hotel.getId())
                .hotelName(hotel.getHotelName())
                .starRating(hotel.getStarRating())
                .district(hotel.getDistrict())
                .city(hotel.getCity())

                .status(hotel.getStatus())
                
                .thumbnailUrl(thumbnail)
                .build();
    }

    public HotelAdminResponse toHotelAdminResponse(Hotel hotel) {
        if (hotel == null)
            return null;

        String thumbnail = null;
        if (hotel.getImages() != null && !hotel.getImages().isEmpty()) {
            thumbnail = hotel.getImages().stream()
                    .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                    .findFirst()
                    .map(img -> img.getImageUrl())
                    .orElseGet(() -> hotel.getImages().get(0).getImageUrl());
        }

        int roomTypeCount = (hotel.getRoomTypes() != null) ? hotel.getRoomTypes().size() : 0;

        return HotelAdminResponse.builder()
                .id(hotel.getId())
                .hotelName(hotel.getHotelName())
                .description(hotel.getDescription())
                .addressLine(hotel.getAddressLine())
                .ward(hotel.getWard())
                .district(hotel.getDistrict())
                .city(hotel.getCity())
                .phone(hotel.getPhone())
                .email(hotel.getEmail())
                .starRating(hotel.getStarRating())

                .ownerId(hotel.getOwner() != null ? hotel.getOwner().getId() : null)
                .ownerName(hotel.getOwner() != null ? hotel.getOwner().getFullName() : null)
                .ownerEmail(hotel.getOwner() != null ? hotel.getOwner().getEmail() : null)

                .status(hotel.getStatus())
                .statusReason(hotel.getStatusReason())
                .deletedAt(hotel.getDeletedAt())
                
                .createdAt(hotel.getCreatedAt())
                .thumbnailUrl(thumbnail)
                .totalRoomTypes(roomTypeCount)
                .build();
    }
}