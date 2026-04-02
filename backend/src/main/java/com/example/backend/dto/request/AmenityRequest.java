package com.example.backend.dto.request;

import lombok.*;

import com.example.backend.enums.AmenityType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmenityRequest {

    @NotBlank(message = "Tên tiện ích không được để trống")
    private String amenityName;
    
    private String iconUrl;

    @NotNull(message = "Loại tiện ích (HOTEL hoặc ROOM) không được để trống")
    private AmenityType type;
}