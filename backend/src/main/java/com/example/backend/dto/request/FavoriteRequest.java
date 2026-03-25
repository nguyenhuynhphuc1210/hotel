package com.example.backend.dto.request;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteRequest {
    private Long hotelId;
}