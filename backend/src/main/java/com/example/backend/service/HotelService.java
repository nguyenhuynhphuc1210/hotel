package com.example.backend.service;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelAdminResponse;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.dto.response.HotelSummaryResponse;
import com.example.backend.enums.HotelStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import java.util.List;

public interface HotelService {
    Page<HotelSummaryResponse> getActiveHotels(int page, int size);

    Page<HotelAdminResponse> getAllHotels(
            int page,
            int size,
            String keyword,
            HotelStatus status);

    Page<HotelAdminResponse> getDeletedHotels(int page, int size);

    HotelResponse getHotelById(Long id);

    HotelResponse createHotel(HotelRequest request);

    HotelResponse updateHotel(Long id, HotelRequest request);

    void deleteHotel(Long id);

    HotelResponse restoreHotel(Long id);

    HotelResponse approveHotel(Long id);

    HotelResponse reactivateHotel(Long id);

    HotelResponse disableHotel(Long id, String reason);

    HotelResponse rejectHotel(Long id, String reason);

    HotelResponse suspendHotel(Long id, String reason);

    BigDecimal getMinPriceForHotel(Long hotelId, LocalDate checkIn, LocalDate checkOut);

    Page<HotelSummaryResponse> searchHotels(
            List<String> districts,
            String keyword,
            LocalDate checkIn,
            LocalDate checkOut,
            Integer adults,
            Integer children,
            List<Integer> stars,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            List<String> hotelAmenities,
            List<String> roomAmenities,
            List<String> bedTypes,
            String sortBy,
            int page,
            int size);
}
