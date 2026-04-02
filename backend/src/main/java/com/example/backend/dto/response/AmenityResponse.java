package com.example.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

import com.example.backend.enums.AmenityType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmenityResponse {
    private Long id;
    private String amenityName;
    private String iconUrl;
    private AmenityType type;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}