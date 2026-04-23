package com.example.backend.repository;

import com.example.backend.entity.Hotel;
import com.example.backend.enums.HotelStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface HotelRepository extends JpaRepository<Hotel, Long> {

    Page<Hotel> findByStatusAndDeletedAtIsNull(HotelStatus status, Pageable pageable);

    Page<Hotel> findByOwner_EmailAndDeletedAtIsNull(String email, Pageable pageable);

    boolean existsByEmail(String email);

    Page<Hotel> findByDeletedAtIsNotNull(Pageable pageable);

    Page<Hotel> findByDeletedAtIsNull(Pageable pageable);

    @Query("""
            SELECT DISTINCT h FROM Hotel h
            WHERE h.status = com.example.backend.enums.HotelStatus.APPROVED AND h.deletedAt IS NULL
            AND (:district IS NULL OR LOWER(h.district) LIKE LOWER(CONCAT('%', :district, '%')))
            AND (:keyword IS NULL OR LOWER(h.hotelName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.addressLine) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:checkIn IS NULL OR :checkOut IS NULL OR EXISTS (
                SELECT 1 FROM RoomType rt
                JOIN RoomCalendar rc ON rt.id = rc.roomType.id
                WHERE rt.hotel.id = h.id
                AND rt.isActive = true AND rt.deletedAt IS NULL
                AND (rt.maxAdults + COALESCE(rt.maxChildren, 0)) >= :guests
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
            @Param("guests") Integer guests,
            Pageable pageable);

    @Query("""
                SELECT h.owner.email FROM Hotel h
                WHERE h.id = :id
            """)
    String findOwnerEmailByHotelId(@Param("id") Long id);
}