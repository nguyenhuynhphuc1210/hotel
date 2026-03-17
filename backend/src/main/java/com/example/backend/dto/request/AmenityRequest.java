package com.example.backend.dto.request;

import lombok.*;
import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmenityRequest {

    @NotBlank(message = "Tên tiện ích không được để trống")
    private String amenityName;
    
    private String iconUrl;
}