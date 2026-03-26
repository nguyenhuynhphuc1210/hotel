package com.example.backend.repository;

import com.example.backend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findByHotelOwnerEmailOrderByCreatedAtDesc(String ownerEmail);

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    List<Booking> findByGuestEmailOrderByCreatedAtDesc(String guestEmail);

    Optional<Booking> findByBookingCodeAndGuestEmail(String bookingCode, String guestEmail);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.hotel.id = :hotelId AND b.status = 'COMPLETED' AND DATE(b.updatedAt) = :date")
    Integer countCompletedBookingsByDateAndHotel(@Param("hotelId") Long hotelId, @Param("date") LocalDate date);

    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.hotel.id = :hotelId AND b.status = 'COMPLETED' AND DATE(b.updatedAt) = :date")
    BigDecimal sumRevenueByDateAndHotel(@Param("hotelId") Long hotelId, @Param("date") LocalDate date);
}