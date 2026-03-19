package com.example.backend.repository;

import com.example.backend.entity.RoomCalendar;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RoomCalendarRepository extends JpaRepository<RoomCalendar, Long> {
    List<RoomCalendar> findByRoomType_Hotel_Owner_Email(String email);
    List<RoomCalendar> findByRoomType_IdAndDateBetween(Long roomTypeId, LocalDate startDate, LocalDate endDate);
    Optional<RoomCalendar> findByRoomType_IdAndDate(Long roomTypeId, LocalDate date);

    @Modifying
    @Query("UPDATE RoomCalendar c SET c.price = :newPrice WHERE c.roomType.id = :roomTypeId AND c.date >= :startDate")
    void updateFuturePrice(@Param("roomTypeId") Long roomTypeId, @Param("newPrice") BigDecimal newPrice,
            @Param("startDate") LocalDate startDate);

    @Modifying
    @Query("UPDATE RoomCalendar c SET c.totalRooms = :newTotalRooms WHERE c.roomType.id = :roomTypeId AND c.date >= :startDate")
    void updateFutureTotalRooms(@Param("roomTypeId") Long roomTypeId, @Param("newTotalRooms") Integer newTotalRooms,
            @Param("startDate") LocalDate startDate);

    @Modifying
    @Query("UPDATE RoomCalendar c SET c.isAvailable = false WHERE c.roomType.id = :roomTypeId AND c.date >= CURRENT_DATE")
    void stopFutureSales(@Param("roomTypeId") Long roomTypeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM RoomCalendar c WHERE c.roomType.id = :roomTypeId AND c.date >= :startDate AND c.date <= :endDate")
    List<RoomCalendar> findAndLockByRoomType_IdAndDateBetween(
            @Param("roomTypeId") Long roomTypeId, 
            @Param("startDate") LocalDate startDate, 
            @Param("endDate") LocalDate endDate
    );
}