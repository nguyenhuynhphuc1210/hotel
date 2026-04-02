package com.example.backend.controller;

import com.example.backend.dto.request.RoomTypeAmenityRequest;
import com.example.backend.dto.response.RoomTypeAmenityResponse;
import com.example.backend.service.RoomTypeAmenityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/room-type-amenities")
@RequiredArgsConstructor
public class RoomTypeAmenityController {

    private final RoomTypeAmenityService service;

    @PostMapping
    public ResponseEntity<RoomTypeAmenityResponse> create(@Valid @RequestBody RoomTypeAmenityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping
    public ResponseEntity<List<RoomTypeAmenityResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{roomTypeId}/{amenityId}")
    public ResponseEntity<RoomTypeAmenityResponse> getById(
            @PathVariable Long roomTypeId,
            @PathVariable Long amenityId
    ) {
        return ResponseEntity.ok(service.getById(roomTypeId, amenityId));
    }

    @GetMapping("/room-type/{roomTypeId}")
    public ResponseEntity<List<RoomTypeAmenityResponse>> getByRoomType(@PathVariable Long roomTypeId) {
        return ResponseEntity.ok(service.getByRoomType(roomTypeId));
    }

    @PutMapping
    public ResponseEntity<RoomTypeAmenityResponse> update(@Valid @RequestBody RoomTypeAmenityRequest request) {
        return ResponseEntity.ok(service.update(request));
    }

    @DeleteMapping("/{roomTypeId}/{amenityId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long roomTypeId,
            @PathVariable Long amenityId
    ) {
        service.delete(roomTypeId, amenityId);
        return ResponseEntity.noContent().build();
    }
}