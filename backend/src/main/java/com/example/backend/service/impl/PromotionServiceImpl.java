package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.PromotionRequest;
import com.example.backend.dto.response.PromotionResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Promotion;
import com.example.backend.mapper.PromotionMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.PromotionRepository;
import com.example.backend.service.PromotionService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotionRepository;
    private final HotelRepository hotelRepository;
    private final PromotionMapper promotionMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PromotionResponse> getAllPromotions() {
        return promotionRepository.findAll()
                .stream()
                .map(promotionMapper::toPromotionResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionResponse getPromotionById(Long id) {
        return promotionRepository.findById(id)
                .map(promotionMapper::toPromotionResponse)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy mã giảm giá với ID = " + id));
    }

    @Override
    @Transactional
    public PromotionResponse createPromotion(PromotionRequest request) {

        validatePromotionDate(request);

        boolean admin = isAdmin();
        boolean owner = isHotelOwner();

        if (!admin && !owner) {
            throw new AccessDeniedException(
                    "Bạn không có quyền tạo mã giảm giá!");
        }

        Hotel hotel = null;

        if (owner && !admin) {

            if (request.getHotelId() == null) {
                throw new IllegalArgumentException(
                        "Chủ khách sạn phải chọn khách sạn!");
            }

            hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Không tìm thấy khách sạn với ID = "
                                    + request.getHotelId()));

            checkOwnerOrAdmin(hotel.getOwner().getEmail());
        }

        if (admin && request.getHotelId() != null) {

            hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Không tìm thấy khách sạn với ID = "
                                    + request.getHotelId()));
        }

        validateDuplicatePromoCode(
                hotel,
                request.getPromoCode(),
                null);

        Promotion promotion = promotionMapper.toPromotion(request, hotel);

        Promotion saved = promotionRepository.save(promotion);

        return promotionMapper.toPromotionResponse(saved);
    }

    @Override
    @Transactional
    public PromotionResponse updatePromotion(Long id,
            PromotionRequest request) {

        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy mã giảm giá với ID = " + id));

        validatePromotionDate(request);

        boolean admin = isAdmin();

        if (!admin) {

            if (existing.getHotel() == null) {
                throw new AccessDeniedException(
                        "Bạn không có quyền sửa mã giảm giá toàn hệ thống!");
            }

            checkOwnerOrAdmin(
                    existing.getHotel().getOwner().getEmail());
        }

        if (request.getHotelId() != null) {

            Hotel hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Không tìm thấy khách sạn với ID = "
                                    + request.getHotelId()));

            existing.setHotel(hotel);
        }

        if (request.getPromoCode() != null &&
                !request.getPromoCode()
                        .equalsIgnoreCase(existing.getPromoCode())) {

            validateDuplicatePromoCode(
                    existing.getHotel(),
                    request.getPromoCode(),
                    existing.getId());

            existing.setPromoCode(request.getPromoCode());
        }

        if (request.getDiscountPercent() != null) {
            existing.setDiscountPercent(
                    request.getDiscountPercent());
        }

        if (request.getMaxDiscountAmount() != null) {
            existing.setMaxDiscountAmount(
                    request.getMaxDiscountAmount());
        }

        if (request.getStartDate() != null) {
            existing.setStartDate(request.getStartDate());
        }

        if (request.getEndDate() != null) {
            existing.setEndDate(request.getEndDate());
        }

        if (request.getMinOrderValue() != null) {
            existing.setMinOrderValue(
                    request.getMinOrderValue());
        }

        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }

        Promotion updated = promotionRepository.save(existing);

        return promotionMapper.toPromotionResponse(updated);
    }

    @Override
    @Transactional
    public void deletePromotion(Long id) {

        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy mã giảm giá với ID = " + id));

        if (!isAdmin()) {

            if (existing.getHotel() == null) {
                throw new AccessDeniedException(
                        "Bạn không có quyền xoá mã giảm giá toàn hệ thống!");
            }

            checkOwnerOrAdmin(
                    existing.getHotel().getOwner().getEmail());
        }

        promotionRepository.delete(existing);
    }

    private void validatePromotionDate(PromotionRequest request) {

        if (request.getStartDate() != null &&
                request.getEndDate() != null) {

            if (!request.getStartDate()
                    .isBefore(request.getEndDate())) {

                throw new IllegalArgumentException(
                        "Ngày kết thúc phải lớn hơn ngày bắt đầu!");
            }

            if (request.getEndDate()
                    .isBefore(LocalDateTime.now())) {

                throw new IllegalArgumentException(
                        "Ngày kết thúc không được nằm trong quá khứ!");
            }
        }
    }

    private void validateDuplicatePromoCode(Hotel hotel,
            String promoCode,
            Long currentPromotionId) {

        if (promoCode == null || promoCode.isBlank()) {
            return;
        }

        List<Promotion> promotions = promotionRepository.findAll();

        boolean exists = promotions.stream()
                .anyMatch(p -> {

                    if (currentPromotionId != null &&
                            p.getId().equals(currentPromotionId)) {
                        return false;
                    }

                    boolean sameHotel;

                    if (hotel == null && p.getHotel() == null) {
                        sameHotel = true;
                    } else if (hotel != null && p.getHotel() != null) {
                        sameHotel = hotel.getId()
                                .equals(p.getHotel().getId());
                    } else {
                        sameHotel = false;
                    }

                    return sameHotel &&
                            p.getPromoCode()
                                    .equalsIgnoreCase(promoCode);
                });

        if (exists) {

            if (hotel != null) {
                throw new IllegalArgumentException(
                        "Mã giảm giá '" + promoCode +
                                "' đã tồn tại trong khách sạn này!");
            }

            throw new IllegalArgumentException(
                    "Mã giảm giá toàn hệ thống đã tồn tại!");
        }
    }
}