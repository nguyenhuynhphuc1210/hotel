package com.example.backend.repository;

import com.example.backend.entity.HotelAmenity;
import com.example.backend.entity.HotelAmenityId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HotelAmenityRepository extends JpaRepository<HotelAmenity, HotelAmenityId> {

    List<HotelAmenity> findByHotel_Id(Long hotelId);

    List<HotelAmenity> findByAmenity_Id(Long amenityId);

    void deleteByHotel_IdAndAmenity_Id(Long hotelId, Long amenityId);

    boolean existsByHotel_IdAndAmenity_Id(Long hotelId, Long amenityId);
}