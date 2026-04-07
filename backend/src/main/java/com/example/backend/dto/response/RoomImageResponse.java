package com.example.backend.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomImageResponse {
    private Long id;
    private String imageUrl;
    private Boolean isPrimary;
    private String publicId;
}