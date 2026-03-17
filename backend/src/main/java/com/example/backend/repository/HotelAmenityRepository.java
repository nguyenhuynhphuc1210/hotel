package com.example.backend.repository;

import com.example.backend.entity.HotelAmenity;
import com.example.backend.entity.HotelAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelAmenityRepository extends JpaRepository<HotelAmenity, HotelAmenityId> {
}