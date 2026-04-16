package com.example.backend.dto.response;

import com.example.backend.enums.HotelStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelAdminResponse {
    private Long id;
    private String hotelName;
    private String description;
    private String addressLine;
    private String ward;
    private String district;
    private String city;
    private String phone;
    private String email;
    private BigDecimal starRating;

    private Long ownerId;
    private String ownerName;
    private String ownerEmail;

    private HotelStatus status;
    private String statusReason;
    private LocalDateTime deletedAt;
    
    private LocalDateTime createdAt;

    private String thumbnailUrl;
    private Integer totalRoomTypes;
}