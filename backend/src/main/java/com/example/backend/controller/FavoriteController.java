package com.example.backend.controller;

import com.example.backend.dto.response.FavoriteResponse;
import com.example.backend.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping("/{hotelId}/toggle")
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(@PathVariable Long hotelId) {
        boolean isFavorited = favoriteService.toggleFavorite(hotelId);

        return ResponseEntity.ok(Map.of("isFavorited", isFavorited));
    }

    @GetMapping("/my-favorites")
    public ResponseEntity<Page<FavoriteResponse>> getMyFavorites(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(favoriteService.getMyFavorites(page, size));
    }
}