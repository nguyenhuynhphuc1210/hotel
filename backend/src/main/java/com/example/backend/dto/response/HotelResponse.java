package com.example.backend.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelResponse {
    private Long id;
    private String hotelName;
    private String description;
    private BigDecimal starRating;
    private String addressLine;
    private String ward;
    private String district;
    private String city;
    private String phone;
    private String email;
    private Long ownerId;
    private String ownerName;
    private Boolean isActive;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<HotelImageResponse> images;
}