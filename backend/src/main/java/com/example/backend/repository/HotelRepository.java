package com.example.backend.repository;

import com.example.backend.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    List<Hotel> findByIsActiveTrueAndIsDeletedFalse();

    List<Hotel> findByOwnerEmailAndIsDeletedFalse(String email);
    
    boolean existsByEmail(String email);

    List<Hotel> findByIsDeletedTrue();

    List<Hotel> findByIsDeletedFalse();

}