package com.example.backend.repository;

import com.example.backend.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {
    List<RoomType> findByHotelOwnerEmail(String email);

    List<RoomType> findByHotelIdAndIsActiveTrue(Long hotelId);

    List<RoomType> findByIsActiveTrue();

    List<RoomType> findByHotelIdAndIsActiveTrue(Long hotelId);
}