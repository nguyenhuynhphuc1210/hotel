package com.example.backend.repository;

import com.example.backend.entity.Review;

import java.math.BigDecimal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    @Query("""
            SELECT COALESCE(AVG(r.rating), 0) 
            FROM Review r
            WHERE r.hotel.id = :hotelId
            AND r.isPublished = true
            """)
    BigDecimal getAverageRating(@Param("hotelId") Long hotelId);

    boolean existsByBookingId(Long bookingId);

    Page<Review> findByHotelIdAndIsPublishedTrueOrderByCreatedAtDesc(Long hotelId, Pageable pageable);

    Page<Review> findByHotelIdOrderByCreatedAtDesc(Long hotelId, Pageable pageable);
}