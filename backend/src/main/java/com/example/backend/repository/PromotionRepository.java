package com.example.backend.repository;

import com.example.backend.entity.Promotion;

import java.time.LocalDate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    @Query("SELECT p FROM Promotion p WHERE p.promoCode = :code AND p.isActive = true AND p.startDate <= :today AND p.endDate >= :today")
    Optional<Promotion> findValidPromotion(@Param("code") String code, @Param("today") LocalDate today);
}