package com.example.backend.entity;

import lombok.*;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeAmenityId implements Serializable {

    private Long roomType;
    private Long amenity;
}