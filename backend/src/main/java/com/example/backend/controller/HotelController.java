package com.example.backend.controller;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelAdminResponse;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.dto.response.HotelSummaryResponse;
import com.example.backend.service.HotelService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
public class HotelController {

    private final HotelService hotelService;

    @GetMapping("/active")
    public ResponseEntity<List<HotelSummaryResponse>> getActiveHotels() {
        return ResponseEntity.ok(hotelService.getActiveHotels());
    }

    @GetMapping
    public ResponseEntity<List<HotelAdminResponse>> getAllHotels() {
        return ResponseEntity.ok(hotelService.getAllHotels());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelResponse> getHotelById(@PathVariable Long id) {
        return ResponseEntity.ok(hotelService.getHotelById(id));
    }

    @PostMapping
    public ResponseEntity<HotelResponse> createHotel(@Valid @RequestBody HotelRequest request) {
        HotelResponse response = hotelService.createHotel(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HotelResponse> updateHotel(
            @PathVariable Long id, 
            @Valid @RequestBody HotelRequest request) {
        return ResponseEntity.ok(hotelService.updateHotel(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHotel(@PathVariable Long id) {
        hotelService.deleteHotel(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<HotelResponse> restoreHotel(@PathVariable Long id) {
        return ResponseEntity.ok(hotelService.restoreHotel(id));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<HotelResponse> approveHotel(@PathVariable Long id) {
        return ResponseEntity.ok(hotelService.approveHotel(id));
    }

    @PatchMapping("/{id}/disable")
    public ResponseEntity<HotelResponse> disableHotel(@PathVariable Long id) {
        return ResponseEntity.ok(hotelService.disableHotel(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<HotelSummaryResponse>> searchHotels(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests) {
        
        List<HotelSummaryResponse> results = hotelService.searchHotels(district, keyword, checkIn, checkOut, guests);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}/min-price")
    public ResponseEntity<BigDecimal> getMinPrice(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {
        return ResponseEntity.ok(hotelService.getMinPriceForHotel(id, checkIn, checkOut));
    }
}