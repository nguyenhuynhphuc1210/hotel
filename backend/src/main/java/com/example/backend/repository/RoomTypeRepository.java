package com.example.backend.repository;

import com.example.backend.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;


public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {


    List<RoomType> findByHotelIsDeletedFalseAndIsDeletedFalse();
    
    List<RoomType> findByHotelOwnerEmailAndHotelIsDeletedFalseAndIsDeletedFalse(String email);

    List<RoomType> findByHotelIdAndIsActiveTrueAndIsDeletedFalse(Long hotelId);
    List<RoomType> findByIsActiveTrueAndIsDeletedFalse();

    List<RoomType> findByIsDeletedTrue();

    List<RoomType> findByHotelOwnerEmailAndIsDeletedTrue(String email);

    @Modifying
    @Query("UPDATE RoomType rt SET rt.isActive = :isActive WHERE rt.hotel.id = :hotelId")
    void updateIsActiveByHotelId(@Param("hotelId") Long hotelId, @Param("isActive") boolean isActive);

    @Modifying
    @Query("UPDATE RoomType rt SET rt.isDeleted = :isDeleted WHERE rt.hotel.id = :hotelId")
    void updateIsDeletedByHotelId(@Param("hotelId") Long hotelId, @Param("isDeleted") boolean isDeleted);

}