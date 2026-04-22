package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeSummaryResponse {
    private Long id;
    private Long hotelId;
    private String hotelName;
    private String typeName;
    private Integer maxAdults;
    private Integer maxChildren;
    private String bedType;
    private Double roomSize;
    private BigDecimal basePrice;
    private Integer totalRooms;
    private Boolean isActive;
    private Boolean isNonSmoking;
    private String thumbnailUrl;
}