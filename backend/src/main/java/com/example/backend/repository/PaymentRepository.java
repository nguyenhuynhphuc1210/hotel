package com.example.backend.repository;

import com.example.backend.dto.export.PaymentExport;
import com.example.backend.entity.Payment;
import com.example.backend.enums.PaymentMethod;
import com.example.backend.enums.PaymentStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBooking_Id(Long bookingId);

    Page<Payment> findByBooking_Hotel_Owner_Email(String ownerEmail, Pageable pageable);

    @Query("""
                SELECT p
                FROM Payment p
                JOIN p.booking b
                JOIN b.hotel h
                JOIN h.owner o

                WHERE (

                    :keyword IS NULL

                    OR LOWER(b.bookingCode)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                    OR LOWER(COALESCE(p.transactionId, ''))
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                    OR LOWER(b.guestName)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))

                    OR LOWER(h.hotelName)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))
                )

                AND (
                    :status IS NULL
                    OR p.status = :status
                )

                AND (
                    :method IS NULL
                    OR p.paymentMethod = :method
                )

                AND (
                    :hotelId IS NULL
                    OR h.id = :hotelId
                )

                AND (
                    :ownerId IS NULL
                    OR o.id = :ownerId
                )

                AND (
                    :currentOwnerEmail IS NULL
                    OR o.email = :currentOwnerEmail
                )
            """)
    Page<Payment> searchPayments(
            @Param("keyword") String keyword,
            @Param("status") PaymentStatus status,
            @Param("method") PaymentMethod method,
            @Param("hotelId") Long hotelId,
            @Param("ownerId") Long ownerId,
            @Param("currentOwnerEmail") String currentOwnerEmail,
            Pageable pageable);

    @Query("""
            SELECT new com.example.backend.dto.export.PaymentExport(
                b.bookingCode,
                h.hotelName,
                b.guestName,
                p.paymentMethod,
                p.transactionId,
                p.amount,
                p.status,
                p.paymentDate,
                p.createdAt
            )

            FROM Payment p
            JOIN p.booking b
            JOIN b.hotel h
            JOIN h.owner o

            WHERE (

                :keyword IS NULL

                OR LOWER(b.bookingCode)
                    LIKE LOWER(CONCAT('%', :keyword, '%'))

                OR LOWER(COALESCE(p.transactionId, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))

                OR LOWER(b.guestName)
                    LIKE LOWER(CONCAT('%', :keyword, '%'))

                OR LOWER(h.hotelName)
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
            )

            AND (
                :status IS NULL
                OR p.status = :status
            )

            AND (
                :method IS NULL
                OR p.paymentMethod = :method
            )

            AND (
                :hotelId IS NULL
                OR h.id = :hotelId
            )

            AND (
                :ownerId IS NULL
                OR o.id = :ownerId
            )

            AND (
                :currentOwnerEmail IS NULL
                OR o.email = :currentOwnerEmail
            )

            ORDER BY p.createdAt DESC
            """)
    List<PaymentExport> exportPayments(
            @Param("keyword") String keyword,
            @Param("status") PaymentStatus status,
            @Param("method") PaymentMethod method,
            @Param("hotelId") Long hotelId,
            @Param("ownerId") Long ownerId,
            @Param("currentOwnerEmail") String currentOwnerEmail);
}