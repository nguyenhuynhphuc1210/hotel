package com.example.backend.repository;

import com.example.backend.entity.BookingRoomRate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRoomRateRepository extends JpaRepository<BookingRoomRate, Long> {
    
}