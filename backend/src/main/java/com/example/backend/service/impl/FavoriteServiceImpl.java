package com.example.backend.service.impl;

import com.example.backend.dto.response.FavoriteResponse;
import com.example.backend.entity.Favorite;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import jakarta.persistence.EntityNotFoundException;
import com.example.backend.mapper.FavoriteMapper;
import com.example.backend.repository.FavoriteRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final FavoriteMapper favoriteMapper;

    @Override
    @Transactional
    public boolean toggleFavorite(Long hotelId) {

        String email = SecurityUtils.getCurrentUserEmail();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thông tin tài khoản"));


        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));


        Optional<Favorite> existingFavorite = favoriteRepository.findByUser_IdAndHotel_Id(currentUser.getId(), hotelId);

        if (existingFavorite.isPresent()) {

            favoriteRepository.delete(existingFavorite.get());
            return false;
        } else {

            Favorite newFavorite = Favorite.builder()
                    .user(currentUser)
                    .hotel(hotel)
                    .build();
            favoriteRepository.save(newFavorite);
            return true;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FavoriteResponse> getMyFavorites(int page, int size) {
        String email = SecurityUtils.getCurrentUserEmail();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thông tin tài khoản"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        return favoriteRepository.findByUser_Id(currentUser.getId(), pageable)
                .map(favoriteMapper::toFavoriteResponse);
    }
}