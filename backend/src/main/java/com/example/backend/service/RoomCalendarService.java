package com.example.backend.service;

import com.example.backend.dto.request.UpdateCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;
import com.example.backend.entity.RoomType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface RoomCalendarService {

    void generateCalendarForNewRoomType(RoomType roomType);

    void syncFutureCalendar(Long roomTypeId, BigDecimal newPrice, Integer newTotalRooms);

    void deactivateFutureCalendar(Long roomTypeId);

    void updateCalendarByDateRange(Long roomTypeId, UpdateCalendarRequest request);

    List<RoomCalendarResponse> getCalendarByDateRange(Long roomTypeId, LocalDate startDate, LocalDate endDate);

}