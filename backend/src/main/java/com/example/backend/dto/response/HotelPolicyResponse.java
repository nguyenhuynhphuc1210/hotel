package com.example.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelPolicyResponse {
    private Long id;
    private Long hotelId;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private String cancellationPolicy;
    private String childrenPolicy;
    private String petPolicy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}