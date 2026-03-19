package com.example.backend.repository;

import com.example.backend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findByHotelOwnerEmailOrderByCreatedAtDesc(String ownerEmail);

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    List<Booking> findByGuestEmailOrderByCreatedAtDesc(String guestEmail);

    Optional<Booking> findByBookingCodeAndGuestEmail(String bookingCode, String guestEmail);
}