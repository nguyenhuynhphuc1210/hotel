package com.example.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelPolicyResponse {
    private Long id;
    private Long hotelId;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    private LocalTime checkInTime;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    private LocalTime checkOutTime;
    
    private String cancellationPolicy;
    private String childrenPolicy;
    private String petPolicy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}