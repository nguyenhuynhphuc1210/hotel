package com.example.backend.repository;

import com.example.backend.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    // 1. Thay IsDeletedFalse thành DeletedAtIsNull
    List<RoomType> findByIsActiveTrueAndDeletedAtIsNull();
    
    // 2. Lấy các loại phòng đang hoạt động của 1 khách sạn cụ thể
    List<RoomType> findByHotelIdAndIsActiveTrueAndDeletedAtIsNull(Long hotelId);
    
    // 3. Lấy tất cả loại phòng chưa xóa (và khách sạn chứa nó cũng chưa xóa)
    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.deletedAt IS NULL AND rt.deletedAt IS NULL")
    List<RoomType> findAllActiveSystemRoomTypes();

    // 4. Lấy danh sách các loại phòng đã bị thùng rác (DeletedAt IsNotNull)
    List<RoomType> findByDeletedAtIsNotNull();

    // 5. Lấy danh sách loại phòng chưa xóa của chính Owner đó
    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.owner.email = :email AND rt.hotel.deletedAt IS NULL AND rt.deletedAt IS NULL")
    List<RoomType> findActiveRoomTypesByOwner(@Param("email") String email);

    // 6. Lấy danh sách loại phòng đã xóa của chính Owner đó
    @Query("SELECT rt FROM RoomType rt WHERE rt.hotel.owner.email = :email AND rt.deletedAt IS NOT NULL")
    List<RoomType> findDeletedRoomTypesByOwner(@Param("email") String email);

    @Modifying
    @Query("UPDATE RoomType rt SET rt.isActive = :isActive WHERE rt.hotel.id = :hotelId")
    void updateIsActiveByHotelId(@Param("hotelId") Long hotelId, @Param("isActive") boolean isActive);

    // 7. Sửa lại hàm cập nhật xóa mềm bằng LocalDateTime
    @Modifying
    @Query("UPDATE RoomType rt SET rt.deletedAt = :deletedAt WHERE rt.hotel.id = :hotelId")
    void updateDeletedAtByHotelId(@Param("hotelId") Long hotelId, @Param("deletedAt") LocalDateTime deletedAt);
}