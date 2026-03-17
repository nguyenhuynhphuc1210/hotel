package com.example.backend.dto.request;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelImageRequest {
    private Long hotelId;
    private String imageUrl;
    private Boolean isPrimary;
}