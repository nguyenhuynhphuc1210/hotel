package com.example.backend.mapper;

import com.example.backend.dto.request.FavoriteRequest;
import com.example.backend.dto.response.FavoriteResponse;
import com.example.backend.entity.Favorite;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class FavoriteMapper {
    public Favorite toFavorite(FavoriteRequest req, User user, Hotel hotel) {
        if (req == null) return null;
        return Favorite.builder()
                .user(user)
                .hotel(hotel)
                .build();
    }

    public FavoriteResponse toFavoriteResponse(Favorite f) {
        if (f == null) return null;
        return FavoriteResponse.builder()
                .userId(f.getUser() != null ? f.getUser().getId() : null)
                .userEmail(f.getUser() != null ? f.getUser().getEmail() : null)
                .hotelId(f.getHotel() != null ? f.getHotel().getId() : null)
                .hotelName(f.getHotel() != null ? f.getHotel().getHotelName() : null)
                .createdAt(f.getCreatedAt())
                .build();
    }
}
