package com.example.backend.repository;

import com.example.backend.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    List<Hotel> findByIsActiveTrue();

    List<Hotel> findByOwnerEmail(String email);
    
    boolean existsByEmail(String email);

}