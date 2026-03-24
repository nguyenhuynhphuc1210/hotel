package com.example.backend.repository;

import com.example.backend.entity.HotelPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface HotelPolicyRepository extends JpaRepository<HotelPolicy, Long> {
    boolean existsByHotel_Id(Long hotelId);

    List<HotelPolicy> findByHotel_Owner_Email(String email);

    Optional<HotelPolicy> findByHotel_Id(Long hotelId);
}