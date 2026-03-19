package com.example.backend.controller;

import com.example.backend.dto.request.UpdateCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;
import com.example.backend.service.impl.RoomCalendarServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/room-calendars")
@RequiredArgsConstructor
public class RoomCalendarController {

    private final RoomCalendarServiceImpl roomCalendarService;

    @PutMapping("/room-types/{roomTypeId}/range")
    public ResponseEntity<String> updateCalendarRange(
            @PathVariable Long roomTypeId,
            @Valid @RequestBody UpdateCalendarRequest request
    ) {
        
        roomCalendarService.updateCalendarByDateRange(roomTypeId, request);
        
        return ResponseEntity.ok("Đã cập nhật lịch và giá phòng thành công!");
    }

    @GetMapping("/room-types/{roomTypeId}")
    public ResponseEntity<List<RoomCalendarResponse>> getRoomCalendar(
            @PathVariable Long roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        
        List<RoomCalendarResponse> responses = roomCalendarService.getCalendarByDateRange(roomTypeId, startDate, endDate);
        
        return ResponseEntity.ok(responses);
    }
}