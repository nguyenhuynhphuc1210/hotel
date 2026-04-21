package com.example.backend.repository;

import com.example.backend.entity.RoomTypeAmenity;
import com.example.backend.entity.RoomTypeAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomTypeAmenityRepository extends JpaRepository<RoomTypeAmenity, RoomTypeAmenityId> {

    @Query("SELECT r FROM RoomTypeAmenity r WHERE r.roomType.hotel.owner.email = :email")
    List<RoomTypeAmenity> findByOwnerEmail(@Param("email") String email);

    List<RoomTypeAmenity> findByRoomType_Id(Long roomTypeId);

    @Query("SELECT COUNT(rta) > 0 FROM RoomTypeAmenity rta WHERE rta.roomType.id = :roomTypeId AND rta.amenity.id = :amenityId")
    boolean existsByRoomTypeAndAmenity(@Param("roomTypeId") Long roomTypeId, @Param("amenityId") Long amenityId);

    void deleteByRoomType_IdAndAmenity_Id(Long roomTypeId, Long amenityId);
}