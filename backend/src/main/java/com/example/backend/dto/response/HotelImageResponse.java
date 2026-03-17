package com.example.backend.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelImageResponse {
    private Long id;
    private Long hotelId;
    private String imageUrl;
    private Boolean isPrimary;
}