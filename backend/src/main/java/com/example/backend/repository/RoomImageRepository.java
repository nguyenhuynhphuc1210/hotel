package com.example.backend.repository;

import com.example.backend.entity.RoomImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RoomImageRepository extends JpaRepository<RoomImage, Long> {
    Optional<RoomImage> findByPublicId(String publicId);

    @Modifying
    @Query("UPDATE RoomImage ri SET ri.isPrimary = false WHERE ri.roomType.id = :roomTypeId")
    void resetPrimaryImageForRoomType(@Param("roomTypeId") Long roomTypeId);
}