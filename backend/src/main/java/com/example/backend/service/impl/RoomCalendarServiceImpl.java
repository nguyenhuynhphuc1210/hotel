package com.example.backend.service.impl;

import com.example.backend.dto.request.UpdateCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.entity.RoomType;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.RoomCalendarService;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.backend.mapper.RoomCalendarMapper;

import jakarta.persistence.EntityNotFoundException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomCalendarServiceImpl implements RoomCalendarService {

    private final RoomCalendarRepository roomCalendarRepository;
    private final RoomCalendarMapper roomCalendarMapper;
    private final RoomTypeRepository roomTypeRepository;

    @Async
    @Transactional
    public void generateCalendarForNewRoomType(RoomType roomType) {
        List<RoomCalendar> calendars = new ArrayList<>();
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusYears(1);

        for (LocalDate date = startDate; date.isBefore(endDate); date = date.plusDays(1)) {
            RoomCalendar calendar = RoomCalendar.builder()
                    .roomType(roomType)
                    .date(date)
                    .price(roomType.getBasePrice())
                    .totalRooms(roomType.getTotalRooms())
                    .bookedRooms(0)
                    .isAvailable(true)
                    .build();
            calendars.add(calendar);
        }

        roomCalendarRepository.saveAll(calendars);
    }

    @Async
    @Transactional
    public void syncFutureCalendar(Long roomTypeId, BigDecimal newPrice, Integer newTotalRooms) {
        LocalDate today = LocalDate.now();

        if (newPrice != null) {
            roomCalendarRepository.updateFuturePrice(roomTypeId, newPrice, today);
        }

        if (newTotalRooms != null) {
            roomCalendarRepository.updateFutureTotalRooms(roomTypeId, newTotalRooms, today);
        }
    }

    @Async
    @Transactional
    public void deactivateFutureCalendar(Long roomTypeId) {
        roomCalendarRepository.stopFutureSales(roomTypeId);
    }

    @Async
    @Transactional
    public void reactivateFutureCalendar(Long roomTypeId) {
        LocalDate today = LocalDate.now();

        roomCalendarRepository.resumeFutureSales(roomTypeId, today);
    }

    @Transactional
    public void updateCalendarByDateRange(Long roomTypeId, UpdateCalendarRequest request) {

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }

        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Loại phòng không tồn tại"));

        SecurityUtils.checkOwnerOrAdmin(
                roomType.getHotel().getOwner().getEmail());

        List<RoomCalendar> calendarsToUpdate = roomCalendarRepository
                .findByRoomType_IdAndDateBetween(roomTypeId, request.getStartDate(), request.getEndDate());

        if (calendarsToUpdate.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy dữ liệu lịch cho khoảng thời gian này. Vui lòng kiểm tra lại.");
        }

        for (RoomCalendar calendar : calendarsToUpdate) {

            if (request.getPrice() != null) {
                calendar.setPrice(request.getPrice());
            }

            if (request.getIsAvailable() != null) {
                calendar.setIsAvailable(request.getIsAvailable());
            }
        }

        roomCalendarRepository.saveAll(calendarsToUpdate);
    }

    @Transactional(readOnly = true)
    public List<RoomCalendarResponse> getCalendarByDateRange(Long roomTypeId, LocalDate startDate, LocalDate endDate) {

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }

        List<RoomCalendar> calendars = roomCalendarRepository
                .findByRoomType_IdAndDateBetween(roomTypeId, startDate, endDate);

        return calendars.stream()
                .map(roomCalendarMapper::toRoomCalendarResponse)
                .collect(Collectors.toList());
    }
}