package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeResponse {
    private Long id;
    private Long hotelId;
    private String hotelName;
    private String typeName;
    private String description;
    private Integer maxAdults;
    private Integer maxChildren;
    private String bedType;
    private Double roomSize;
    private BigDecimal basePrice;
    private Integer totalRooms;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<RoomImageResponse> images;
}