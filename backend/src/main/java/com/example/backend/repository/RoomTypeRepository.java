package com.example.backend.repository;

import com.example.backend.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    List<RoomType> findByIsActiveTrueAndDeletedAtIsNull();

    @Query("""
                SELECT rt FROM RoomType rt
                WHERE rt.hotel.id = :hotelId
                AND rt.hotel.deletedAt IS NULL
                AND rt.isActive = true
                AND rt.deletedAt IS NULL
            """)
    List<RoomType> findActiveRoomTypesByHotel(@Param("hotelId") Long hotelId);

    List<RoomType> findByHotelIdAndDeletedAtIsNull(Long hotelId);

    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.deletedAt IS NULL AND rt.deletedAt IS NULL")
    List<RoomType> findAllNotDeletedSystemRoomTypes();

    List<RoomType> findByDeletedAtIsNotNull();

    @Query("""
                SELECT rt FROM RoomType rt
                JOIN FETCH rt.hotel h
                JOIN FETCH h.owner
                WHERE h.owner.email = :email
                AND h.deletedAt IS NULL
                AND rt.deletedAt IS NULL
            """)
    List<RoomType> findAllNotDeletedRoomTypesByOwner(@Param("email") String email);

    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.owner.email = :email AND rt.deletedAt IS NOT NULL")
    List<RoomType> findDeletedRoomTypesByOwner(@Param("email") String email);

    @Modifying
    @Query("UPDATE RoomType rt SET rt.isActive = :isActive WHERE rt.hotel.id = :hotelId")
    void updateIsActiveByHotelId(@Param("hotelId") Long hotelId, @Param("isActive") boolean isActive);

    @Modifying
    @Query("""
                UPDATE RoomType rt
                SET rt.deletedAt = :deletedAt
                WHERE rt.hotel.id = :hotelId
                AND rt.deletedAt IS NULL
            """)
    void updateDeletedAtByHotelId(@Param("hotelId") Long hotelId, @Param("deletedAt") LocalDateTime deletedAt);
}