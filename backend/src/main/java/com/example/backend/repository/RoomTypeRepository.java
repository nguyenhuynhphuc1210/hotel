package com.example.backend.repository;

import com.example.backend.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    List<RoomType> findByIsActiveTrueAndIsDeletedFalse();
    
    // Lấy các loại phòng đang hoạt động của 1 khách sạn cụ thể
    List<RoomType> findByHotelIdAndIsActiveTrueAndIsDeletedFalse(Long hotelId);

    
    // Lấy tất cả loại phòng chưa xóa (và khách sạn chứa nó cũng chưa xóa)
    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.isDeleted = false AND rt.isDeleted = false")
    List<RoomType> findAllActiveSystemRoomTypes();

    // Lấy danh sách các loại phòng đã bị thùng rác
    List<RoomType> findByIsDeletedTrue();

    // Lấy danh sách loại phòng chưa xóa của chính Owner đó
    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.owner.email = :email AND rt.hotel.isDeleted = false AND rt.isDeleted = false")
    List<RoomType> findActiveRoomTypesByOwner(@Param("email") String email);

    // Lấy danh sách loại phòng đã xóa của chính Owner đó
    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.owner.email = :email AND rt.isDeleted = true")
    List<RoomType> findDeletedRoomTypesByOwner(@Param("email") String email);


    @Modifying
    @Query("UPDATE RoomType rt SET rt.isActive = :isActive WHERE rt.hotel.id = :hotelId")
    void updateIsActiveByHotelId(@Param("hotelId") Long hotelId, @Param("isActive") boolean isActive);

    @Modifying
    @Query("UPDATE RoomType rt SET rt.isDeleted = :isDeleted WHERE rt.hotel.id = :hotelId")
    void updateIsDeletedByHotelId(@Param("hotelId") Long hotelId, @Param("isDeleted") boolean isDeleted);
}