package com.example.backend.service;

import com.example.backend.dto.response.FavoriteResponse;
import org.springframework.data.domain.Page;

public interface FavoriteService {

    boolean toggleFavorite(Long hotelId);
    
    Page<FavoriteResponse> getMyFavorites(int page, int size);
}