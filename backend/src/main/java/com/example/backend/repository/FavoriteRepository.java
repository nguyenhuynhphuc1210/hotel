package com.example.backend.repository;

import com.example.backend.entity.Favorite;
import com.example.backend.entity.FavoriteId;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {
     Optional<Favorite> findByUserAndHotel(User user, Hotel hotel);
}