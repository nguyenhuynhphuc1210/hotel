package com.example.backend.service;

import com.example.backend.dto.request.RoomCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;

import java.util.List;

public interface RoomCalendarService {

    List<RoomCalendarResponse> getAllRoomCalendars();

    RoomCalendarResponse getRoomCalendarById(Long id);

    RoomCalendarResponse createRoomCalendar(RoomCalendarRequest request);

    RoomCalendarResponse updateRoomCalendar(Long id, RoomCalendarRequest request);

    void deleteRoomCalendar(Long id);
}