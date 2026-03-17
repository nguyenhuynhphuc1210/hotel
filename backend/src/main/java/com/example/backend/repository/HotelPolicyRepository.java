package com.example.backend.repository;

import com.example.backend.entity.HotelPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelPolicyRepository extends JpaRepository<HotelPolicy, Long> {
}