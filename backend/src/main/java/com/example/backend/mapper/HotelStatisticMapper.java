package com.example.backend.mapper;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelStatistic;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

@Component
public class HotelStatisticMapper {
    
    public HotelStatistic toHotelStatistic(
            HotelStatisticRequest req,
            Hotel hotel,
            LocalDate statDate,
            Integer totalBookings,
            BigDecimal totalRevenue,
            Integer totalCancelled,
            Integer totalNoShow) {

        if (req == null)
            return null;

        return HotelStatistic.builder()
                .hotel(hotel)
                .statDate(statDate)
                .totalBookings(totalBookings != null ? totalBookings : 0)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .totalCancelled(totalCancelled != null ? totalCancelled : 0)
                .totalNoShow(totalNoShow != null ? totalNoShow : 0)
                .build();
    }

    public HotelStatisticResponse toHotelStatisticResponse(HotelStatistic s) {
        if (s == null)
            return null;
            
        return HotelStatisticResponse.builder()
                .id(s.getId())
                .hotelId(s.getHotel() != null ? s.getHotel().getId() : null)
                .statDate(s.getStatDate())
                .totalBookings(s.getTotalBookings())
                .totalRevenue(s.getTotalRevenue())
                .totalCancelled(s.getTotalCancelled())
                .totalNoShow(s.getTotalNoShow())
                .build();
    }
}