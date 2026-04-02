package com.example.backend.repository;

import com.example.backend.entity.Amenity;
import com.example.backend.enums.AmenityType;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AmenityRepository extends JpaRepository<Amenity, Long> {
    boolean existsByAmenityName(String amenityName);
    
    boolean existsByAmenityNameAndIdNot(String amenityName, Long id);

    List<Amenity> findByType(AmenityType type);
}