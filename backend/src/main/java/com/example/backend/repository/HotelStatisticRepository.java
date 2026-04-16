package com.example.backend.repository;

import com.example.backend.entity.HotelStatistic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface HotelStatisticRepository extends JpaRepository<HotelStatistic, Long> {

    List<HotelStatistic> findByHotel_IdAndStatDateBetweenOrderByStatDateAsc(
            Long hotelId, LocalDate fromDate, LocalDate toDate);

    @Modifying
    @Query("UPDATE HotelStatistic h SET h.totalBookings = h.totalBookings + 1, h.totalRevenue = h.totalRevenue + :totalAmount WHERE h.hotel.id = :hotelId AND h.statDate = :statDate")
    int incrementSuccessfulBooking(
            @Param("hotelId") Long hotelId, 
            @Param("statDate") LocalDate statDate, 
            @Param("totalAmount") BigDecimal totalAmount
    );

    @Modifying
    @Query("UPDATE HotelStatistic h SET h.totalCancelled = h.totalCancelled + 1 WHERE h.hotel.id = :hotelId AND h.statDate = :statDate")
    int incrementCancelledBooking(
            @Param("hotelId") Long hotelId, 
            @Param("statDate") LocalDate statDate
    );

    @Modifying
    @Query("UPDATE HotelStatistic h SET h.totalNoShow = h.totalNoShow + 1 WHERE h.hotel.id = :hotelId AND h.statDate = :statDate")
    int incrementNoShowBooking(
            @Param("hotelId") Long hotelId, 
            @Param("statDate") LocalDate statDate
    );
}