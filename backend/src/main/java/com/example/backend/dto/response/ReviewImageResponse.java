package com.example.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewImageResponse {
    private Long id;
    private String imageUrl;
    private String publicId;
}
