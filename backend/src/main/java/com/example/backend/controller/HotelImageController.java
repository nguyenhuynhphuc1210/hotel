package com.example.backend.controller;

import com.example.backend.dto.request.HotelImageRequest;
import com.example.backend.dto.response.HotelImageResponse;
import com.example.backend.service.HotelImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotel-images")
@RequiredArgsConstructor
public class HotelImageController {
    private final HotelImageService hotelImageService;

    @GetMapping
    public ResponseEntity<List<HotelImageResponse>> getAll() {
        return ResponseEntity.ok(hotelImageService.getAllHotelImages());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelImageResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(hotelImageService.getHotelImageById(id));
    }

    @PostMapping
    public ResponseEntity<HotelImageResponse> create(@RequestBody HotelImageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(hotelImageService.createHotelImage(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HotelImageResponse> update(@PathVariable Long id, @RequestBody HotelImageRequest request) {
        return ResponseEntity.ok(hotelImageService.updateHotelImage(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        hotelImageService.deleteHotelImage(id);
        return ResponseEntity.noContent().build();
    }
}