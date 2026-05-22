package com.example.backend.repository;

import com.example.backend.dto.export.RevenueExport;
import com.example.backend.dto.response.DailyStatisticResponse;
import com.example.backend.dto.response.HotelStatisticSummaryResponse;
import com.example.backend.dto.response.SystemStatisticSummary;
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
    @Query("UPDATE HotelStatistic h SET h.completedBookings = h.completedBookings + 1, h.totalRevenue = h.totalRevenue + :totalAmount WHERE h.hotel.id = :hotelId AND h.statDate = :statDate")
    int incrementSuccessfulBooking(
            @Param("hotelId") Long hotelId,
            @Param("statDate") LocalDate statDate,
            @Param("totalAmount") BigDecimal totalAmount);

    @Modifying
    @Query("UPDATE HotelStatistic h SET h.totalCancelled = h.totalCancelled + 1 WHERE h.hotel.id = :hotelId AND h.statDate = :statDate")
    int incrementCancelledBooking(
            @Param("hotelId") Long hotelId,
            @Param("statDate") LocalDate statDate);

    @Modifying
    @Query("UPDATE HotelStatistic h SET h.totalNoShow = h.totalNoShow + 1 WHERE h.hotel.id = :hotelId AND h.statDate = :statDate")
    int incrementNoShowBooking(
            @Param("hotelId") Long hotelId,
            @Param("statDate") LocalDate statDate);

    @Query("""
            SELECT hs
            FROM HotelStatistic hs
            WHERE hs.hotel.id = :hotelId

            AND (
                :year IS NULL
                OR YEAR(hs.statDate) = :year
            )

            AND (
                :month IS NULL
                OR MONTH(hs.statDate) = :month
            )

            AND (
                :day IS NULL
                OR DAY(hs.statDate) = :day
            )

            AND (
                :fromDate IS NULL
                OR hs.statDate >= :fromDate
            )

            AND (
                :toDate IS NULL
                OR hs.statDate <= :toDate
            )

            ORDER BY hs.statDate ASC
            """)
    List<HotelStatistic> searchStatistics(
            @Param("hotelId") Long hotelId,
            @Param("day") Integer day,
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT new com.example.backend.dto.export.RevenueExport(
                h.hotelName,
                hs.statDate,
                hs.completedBookings,
                hs.totalCancelled,
                hs.totalNoShow,
                hs.totalRevenue
            )
            FROM HotelStatistic hs
            JOIN hs.hotel h
            JOIN h.owner o

            WHERE (

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

            AND (

                :month IS NULL
                OR MONTH(hs.statDate) = :month
            )

            AND (

                :year IS NULL
                OR YEAR(hs.statDate) = :year
            )

            AND (

                :fromDate IS NULL
                OR hs.statDate >= :fromDate
            )

            AND (

                :toDate IS NULL
                OR hs.statDate <= :toDate
            )

            ORDER BY hs.statDate DESC
            """)
    List<RevenueExport> exportRevenue(
            @Param("hotelId") Long hotelId,
            @Param("ownerId") Long ownerId,
            @Param("currentOwnerEmail") String currentOwnerEmail,
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT new com.example.backend.dto.response.SystemStatisticSummary(
                SUM(hs.completedBookings),
                SUM(hs.totalCancelled),
                SUM(hs.totalNoShow),
                SUM(hs.totalRevenue)
            )
            FROM HotelStatistic hs
            WHERE (:month IS NULL OR MONTH(hs.statDate) = :month)
              AND (:year IS NULL OR YEAR(hs.statDate) = :year)
              AND (:fromDate IS NULL OR hs.statDate >= :fromDate)
              AND (:toDate IS NULL OR hs.statDate <= :toDate)
            """)
    SystemStatisticSummary getSystemStatisticSummary(
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT new com.example.backend.dto.response.HotelStatisticSummaryResponse(
                h.id,
                h.hotelName,
                SUM(hs.completedBookings),
                SUM(hs.totalCancelled),
                SUM(hs.totalNoShow),
                SUM(hs.totalRevenue)
            )
            FROM HotelStatistic hs
            JOIN hs.hotel h
            JOIN h.owner o
            WHERE (:hotelId IS NULL OR h.id = :hotelId)
              AND (:ownerId IS NULL OR o.id = :ownerId)
              AND (:ownerEmail IS NULL OR o.email = :ownerEmail)
              AND (:month IS NULL OR MONTH(hs.statDate) = :month)
              AND (:year IS NULL OR YEAR(hs.statDate) = :year)
              AND (:fromDate IS NULL OR hs.statDate >= :fromDate)
              AND (:toDate IS NULL OR hs.statDate <= :toDate)
            GROUP BY h.id, h.hotelName
            ORDER BY SUM(hs.totalRevenue) DESC
            """)
    List<HotelStatisticSummaryResponse> getHotelsSummary(
            @Param("hotelId") Long hotelId,
            @Param("ownerId") Long ownerId,
            @Param("ownerEmail") String ownerEmail,
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT new com.example.backend.dto.response.DailyStatisticResponse(
                hs.statDate,
                SUM(hs.completedBookings),
                SUM(hs.totalCancelled),
                SUM(hs.totalNoShow),
                SUM(hs.totalRevenue)
            )
            FROM HotelStatistic hs
            JOIN hs.hotel h
            JOIN h.owner o
            WHERE (:ownerEmail IS NULL OR o.email = :ownerEmail)
              AND (:ownerId IS NULL OR o.id = :ownerId)
              AND (:hotelId IS NULL OR h.id = :hotelId)
              AND (:month IS NULL OR MONTH(hs.statDate) = :month)
              AND (:year IS NULL OR YEAR(hs.statDate) = :year)
              AND (:fromDate IS NULL OR hs.statDate >= :fromDate)
              AND (:toDate IS NULL OR hs.statDate <= :toDate)
            GROUP BY hs.statDate
            ORDER BY hs.statDate ASC
            """)
    List<DailyStatisticResponse> getDailyChartData(
            @Param("ownerEmail") String ownerEmail,
            @Param("ownerId") Long ownerId,
            @Param("hotelId") Long hotelId,
            @Param("month") Integer month,
            @Param("year") Integer year,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

}