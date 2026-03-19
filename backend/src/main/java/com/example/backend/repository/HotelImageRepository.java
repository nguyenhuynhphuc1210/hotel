package com.example.backend.repository;

import com.example.backend.entity.HotelImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface HotelImageRepository extends JpaRepository<HotelImage, Long> {
    Optional<HotelImage> findByPublicId(String publicId);

    @Modifying
    @Query("UPDATE HotelImage hi SET hi.isPrimary = false WHERE hi.hotel.id = :hotelId")
    void resetPrimaryImageForHotel(@Param("hotelId") Long hotelId);
}