package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomCalendarResponse {
    private Long id;
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate date;
    private BigDecimal price;
    private Integer totalRooms;
    private Integer bookedRooms;
    private Boolean isAvailable;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}