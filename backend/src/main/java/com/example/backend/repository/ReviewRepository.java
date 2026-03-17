package com.example.backend.repository;

import com.example.backend.entity.Review;

import java.math.BigDecimal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    @Query("""
            SELECT AVG(r.rating)
            FROM Review r
            WHERE r.hotel.id = :hotelId
            AND r.isPublished = true
            """)
    BigDecimal getAverageRating(@Param("hotelId") Long hotelId);
}