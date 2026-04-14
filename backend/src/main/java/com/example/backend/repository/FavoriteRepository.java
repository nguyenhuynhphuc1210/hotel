package com.example.backend.repository;

import com.example.backend.entity.Favorite;
import com.example.backend.entity.FavoriteId;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {
     Optional<Favorite> findByUser_IdAndHotel_Id(Long userId, Long hotelId);

    Page<Favorite> findByUser_Id(Long userId, Pageable pageable);
}