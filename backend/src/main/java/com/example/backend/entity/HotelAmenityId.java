package com.example.backend.entity;

import lombok.*;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HotelAmenityId implements Serializable {

    private Long hotel;
    private Long amenity;
}