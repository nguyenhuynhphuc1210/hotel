package com.example.backend.mapper;

import com.example.backend.dto.request.PromotionRequest;
import com.example.backend.dto.response.PromotionResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Promotion;
import org.springframework.stereotype.Component;

@Component
public class PromotionMapper {
    public Promotion toPromotion(PromotionRequest req, Hotel hotel) {
        if (req == null) return null;
        return Promotion.builder()
                .hotel(hotel)
                .promoCode(req.getPromoCode())
                .discountPercent(req.getDiscountPercent())
                .maxDiscountAmount(req.getMaxDiscountAmount())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .minOrderValue(req.getMinOrderValue() != null ? req.getMinOrderValue() : java.math.BigDecimal.ZERO)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();
    }

    public PromotionResponse toPromotionResponse(Promotion p) {
        if (p == null) return null;
        return PromotionResponse.builder()
                .id(p.getId())
                .hotelId(p.getHotel() != null ? p.getHotel().getId() : null)
                .hotelName(p.getHotel() != null ? p.getHotel().getHotelName() : null)
                .promoCode(p.getPromoCode())
                .discountPercent(p.getDiscountPercent())
                .maxDiscountAmount(p.getMaxDiscountAmount())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .minOrderValue(p.getMinOrderValue())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
