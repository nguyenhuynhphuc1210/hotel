package com.example.backend.repository;

import com.example.backend.entity.RoomTypeAmenity;
import com.example.backend.entity.RoomTypeAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomTypeAmenityRepository extends JpaRepository<RoomTypeAmenity, RoomTypeAmenityId> {

    // Xử lý lỗi join sâu bằng Query tường minh
    @Query("SELECT r FROM RoomTypeAmenity r WHERE r.roomType.hotel.owner.email = :email")
    List<RoomTypeAmenity> findByOwnerEmail(@Param("email") String email);

    // Lấy danh sách theo RoomType ID
    @Query("SELECT r FROM RoomTypeAmenity r WHERE r.roomType.id = :roomTypeId")
    List<RoomTypeAmenity> findByRoomTypeId(@Param("roomTypeId") Long roomTypeId);

    // Lấy danh sách theo Amenity ID
    @Query("SELECT r FROM RoomTypeAmenity r WHERE r.amenity.id = :amenityId")
    List<RoomTypeAmenity> findByAmenityId(@Param("amenityId") Long amenityId);

    // Kiểm tra tồn tại
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM RoomTypeAmenity r " +
           "WHERE r.roomType.id = :roomTypeId AND r.amenity.id = :amenityId")
    boolean existsByRoomTypeIdAndAmenityId(@Param("roomTypeId") Long roomTypeId, @Param("amenityId") Long amenityId);

    // Xóa bản ghi
    @Modifying
    @Query("DELETE FROM RoomTypeAmenity r WHERE r.roomType.id = :roomTypeId AND r.amenity.id = :amenityId")
    void deleteByRoomTypeIdAndAmenityId(@Param("roomTypeId") Long roomTypeId, @Param("amenityId") Long amenityId);
}