package com.example.backend.repository;

import com.example.backend.entity.Amenity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AmenityRepository extends JpaRepository<Amenity, Long> {
    boolean existsByAmenityName(String amenityName);
    
    boolean existsByAmenityNameAndIdNot(String amenityName, Long id);
}