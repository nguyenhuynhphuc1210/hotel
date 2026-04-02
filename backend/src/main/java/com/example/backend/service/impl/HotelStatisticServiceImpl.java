package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelStatistic;
import com.example.backend.enums.BookingStatus;
import com.example.backend.mapper.HotelStatisticMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.HotelStatisticRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.HotelStatisticService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HotelStatisticServiceImpl implements HotelStatisticService {

    private final HotelStatisticRepository statisticRepository;
    private final HotelRepository hotelRepository;
    private final HotelStatisticMapper statisticMapper;

    @Override
    @Transactional(readOnly = true)
    public List<HotelStatisticResponse> getStatistics(HotelStatisticRequest request) {

        if (request.getFromDate().isAfter(request.getToDate())) {
            throw new IllegalArgumentException("Ngày bắt đầu không thể sau ngày kết thúc");
        }

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        SecurityUtils.checkOwnerOrAdmin(hotel.getOwner().getEmail());

        List<HotelStatistic> stats = statisticRepository.findByHotelIdAndStatDateBetweenOrderByStatDateAsc(
                request.getHotelId(),
                request.getFromDate(),
                request.getToDate());

        return stats.stream()
                .map(statisticMapper::toHotelStatisticResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void recordRealtimeStatistic(Hotel hotel, BigDecimal totalAmount, LocalDate date, BookingStatus status) {
        int updatedRows = 0;

        switch (status) {
            case COMPLETED:
                updatedRows = statisticRepository.incrementSuccessfulBooking(hotel.getId(), date, totalAmount);
                break;
            case CANCELLED:
                updatedRows = statisticRepository.incrementCancelledBooking(hotel.getId(), date);
                break;
            case NO_SHOW:
                updatedRows = statisticRepository.incrementNoShowBooking(hotel.getId(), date);
                break;
            default:
                log.info("Bỏ qua thống kê cho trạng thái: {}", status);
                return;
        }

        if (updatedRows == 0) {
            try {
                HotelStatistic newStat = HotelStatistic.builder()
                        .hotel(hotel)
                        .statDate(date)
                        .totalBookings(status == BookingStatus.COMPLETED ? 1 : 0)
                        .totalRevenue(status == BookingStatus.COMPLETED ? totalAmount : BigDecimal.ZERO)
                        .totalCancelled(status == BookingStatus.CANCELLED ? 1 : 0)
                        .totalNoShow(status == BookingStatus.NO_SHOW ? 1 : 0)
                        .build();

                statisticRepository.save(newStat);

            } catch (DataIntegrityViolationException e) {
                log.warn("Phát hiện xung đột luồng khi tạo HotelStatistic, đang thực hiện lại...");
                recordRealtimeStatistic(hotel, totalAmount, date, status);
            }
        }
    }
}