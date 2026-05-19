package com.example.backend.repository;

import com.example.backend.entity.Payment;
import com.example.backend.enums.PaymentStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBooking_Id(Long bookingId);

    Page<Payment> findByBooking_Hotel_Owner_Email(String ownerEmail, Pageable pageable);

    @Query("""
        SELECT p
        FROM Payment p
        WHERE (
            :search IS NULL
            OR LOWER(p.booking.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(p.transactionId) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (
            :status IS NULL
            OR p.status = :status
        )
    """)
    Page<Payment> findAllWithFilter(
            @Param("search") String search,
            @Param("status") PaymentStatus status,
            Pageable pageable
    );

    @Query("""
        SELECT p
        FROM Payment p
        WHERE p.booking.hotel.owner.email = :ownerEmail
        AND (
            :search IS NULL
            OR LOWER(p.booking.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(p.transactionId) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (
            :status IS NULL
            OR p.status = :status
        )
    """)
    Page<Payment> findByOwnerWithFilter(
            @Param("ownerEmail") String ownerEmail,
            @Param("search") String search,
            @Param("status") PaymentStatus status,
            Pageable pageable
    );
}