package com.example.backend.repository;

import com.example.backend.entity.Hotel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface HotelRepository extends JpaRepository<Hotel, Long> {

    Page<Hotel> findByIsActiveTrueAndIsDeletedFalse(Pageable pageable);
    
    Page<Hotel> findByOwner_EmailAndIsDeletedFalse(String email, Pageable pageable);

    boolean existsByEmail(String email);
    
    Page<Hotel> findByIsDeletedTrue(Pageable pageable);
    
    Page<Hotel> findByIsDeletedFalse(Pageable pageable);

    @Query("""
            SELECT h FROM Hotel h
            WHERE h.isActive = true AND h.isDeleted = false
            AND (:district IS NULL OR LOWER(h.district) LIKE LOWER(CONCAT('%', :district, '%')))
            AND (:keyword IS NULL OR LOWER(h.hotelName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.addressLine) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:checkIn IS NULL OR :checkOut IS NULL OR EXISTS (
                SELECT 1 FROM RoomType rt
                JOIN RoomCalendar rc ON rt.id = rc.roomType.id
                WHERE rt.hotel.id = h.id
                AND rc.date >= :checkIn AND rc.date < :checkOut
                AND rc.isAvailable = true
                AND (rc.totalRooms - rc.bookedRooms) > 0
                GROUP BY rt.id
                HAVING COUNT(rc.id) = :nights
            ))
            """)
    Page<Hotel> searchHotels(
            @Param("district") String district,
            @Param("keyword") String keyword,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            @Param("nights") Long nights,
            Pageable pageable
    );
}