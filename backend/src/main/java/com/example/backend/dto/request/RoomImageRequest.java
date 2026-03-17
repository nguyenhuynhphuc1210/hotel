package com.example.backend.dto.request;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomImageRequest {
    private Long roomTypeId;
    private String imageUrl;
    private Boolean isPrimary;
}