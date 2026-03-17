package com.example.backend.service.impl;

import com.example.backend.dto.request.PromotionRequest;
import com.example.backend.dto.response.PromotionResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Promotion;
import com.example.backend.mapper.PromotionMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.PromotionRepository;
import com.example.backend.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {
    private final PromotionRepository promotionRepository;
    private final HotelRepository hotelRepository;
    private final PromotionMapper promotionMapper;

    @Override
    public List<PromotionResponse> getAllPromotions() {
        return promotionRepository.findAll().stream().map(promotionMapper::toPromotionResponse).collect(Collectors.toList());
    }

    @Override
    public PromotionResponse getPromotionById(Long id) {
        return promotionRepository.findById(id)
                .map(promotionMapper::toPromotionResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found id=" + id));
    }

    @Override
    public PromotionResponse createPromotion(PromotionRequest request) {
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found id=" + request.getHotelId()));
        Promotion saved = promotionRepository.save(promotionMapper.toPromotion(request, hotel));
        return promotionMapper.toPromotionResponse(saved);
    }

    @Override
    public PromotionResponse updatePromotion(Long id, PromotionRequest request) {
        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found id=" + id));
        if (request.getHotelId() != null) {
            Hotel hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found id=" + request.getHotelId()));
            existing.setHotel(hotel);
        }
        if (request.getPromoCode() != null) existing.setPromoCode(request.getPromoCode());
        if (request.getDiscountPercent() != null) existing.setDiscountPercent(request.getDiscountPercent());
        if (request.getMaxDiscountAmount() != null) existing.setMaxDiscountAmount(request.getMaxDiscountAmount());
        if (request.getStartDate() != null) existing.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) existing.setEndDate(request.getEndDate());
        if (request.getMinOrderValue() != null) existing.setMinOrderValue(request.getMinOrderValue());
        if (request.getIsActive() != null) existing.setIsActive(request.getIsActive());

        return promotionMapper.toPromotionResponse(promotionRepository.save(existing));
    }

    @Override
    public void deletePromotion(Long id) {
        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found id=" + id));
        promotionRepository.delete(existing);
    }
}
