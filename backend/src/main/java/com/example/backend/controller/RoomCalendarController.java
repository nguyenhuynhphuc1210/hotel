package com.example.backend.controller;

import com.example.backend.dto.request.RoomCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;
import com.example.backend.service.RoomCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/room-calendars")
@RequiredArgsConstructor
public class RoomCalendarController {

    private final RoomCalendarService roomCalendarService;

    @GetMapping
    public ResponseEntity<List<RoomCalendarResponse>> getAll() {
        return ResponseEntity.ok(roomCalendarService.getAllRoomCalendars());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomCalendarResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(roomCalendarService.getRoomCalendarById(id));
    }

    @PostMapping
    public ResponseEntity<RoomCalendarResponse> create( @Valid @RequestBody RoomCalendarRequest request) {
        RoomCalendarResponse created = roomCalendarService.createRoomCalendar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomCalendarResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RoomCalendarRequest request
    ) {
        return ResponseEntity.ok(roomCalendarService.updateRoomCalendar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        roomCalendarService.deleteRoomCalendar(id);
        return ResponseEntity.noContent().build();
    }
}