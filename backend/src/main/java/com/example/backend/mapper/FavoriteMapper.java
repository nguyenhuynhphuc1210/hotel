package com.example.backend.mapper;

import com.example.backend.dto.request.FavoriteRequest;
import com.example.backend.dto.response.FavoriteResponse;
import com.example.backend.entity.Favorite;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FavoriteMapper {

    private final HotelMapper hotelMapper;

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

                .hotel(hotelMapper.toHotelSummaryResponse(f.getHotel()))
                .createdAt(f.getCreatedAt())
                .build();
    }
}