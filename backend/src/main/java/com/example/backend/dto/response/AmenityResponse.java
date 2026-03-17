package com.example.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmenityResponse {
    private Long id;
    private String amenityName;
    private String iconUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}