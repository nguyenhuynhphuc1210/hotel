package com.example.backend.repository;

import com.example.backend.entity.Booking;
import com.example.backend.enums.BookingStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    Page<Booking> findByHotel_Owner_Email(String ownerEmail, Pageable pageable);

    Page<Booking> findByUser_Id(Long userId, Pageable pageable);

    Optional<Booking> findByBookingCode(String bookingCode);

    List<Booking> findByStatusAndCreatedAtBefore(BookingStatus status, LocalDateTime dateTime);

    @Query("SELECT b FROM Booking b LEFT JOIN FETCH b.hotel LEFT JOIN FETCH b.bookingRooms WHERE b.id = :id")
    Optional<Booking> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.hotel.id = :hotelId AND b.status = 'COMPLETED' AND DATE(b.updatedAt) = :date")
    Integer countCompletedBookingsByDateAndHotel(@Param("hotelId") Long hotelId, @Param("date") LocalDate date);

    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.hotel.id = :hotelId AND b.status = 'COMPLETED' AND DATE(b.updatedAt) = :date")
    BigDecimal sumRevenueByDateAndHotel(@Param("hotelId") Long hotelId, @Param("date") LocalDate date);

    @Query("""
            SELECT b
            FROM Booking b
            JOIN b.hotel h
            JOIN h.owner o

            WHERE

            (:keyword IS NULL
            OR LOWER(b.bookingCode)
            LIKE LOWER(CONCAT('%',:keyword,'%'))

            OR LOWER(b.guestName)
            LIKE LOWER(CONCAT('%',:keyword,'%'))

            OR LOWER(b.guestEmail)
            LIKE LOWER(CONCAT('%',:keyword,'%'))

            OR LOWER(h.hotelName)
            LIKE LOWER(CONCAT('%',:keyword,'%'))
            )

            AND (:status IS NULL
            OR b.status=:status)

            AND (:hotelId IS NULL
            OR h.id=:hotelId)

            AND (:ownerId IS NULL
            OR o.id=:ownerId)

            AND (:currentOwnerEmail IS NULL
            OR o.email=:currentOwnerEmail)

            """)
    Page<Booking> searchBookings(
            @Param("keyword") String keyword,
            @Param("status") BookingStatus status,
            @Param("hotelId") Long hotelId,
            @Param("ownerId") Long ownerId,
            @Param("currentOwnerEmail") String currentOwnerEmail,
            Pageable pageable);
}