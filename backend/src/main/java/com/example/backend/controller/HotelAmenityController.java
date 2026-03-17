package com.example.backend.controller;

import com.example.backend.dto.request.HotelAmenityRequest;
import com.example.backend.dto.response.HotelAmenityResponse;
import com.example.backend.service.HotelAmenityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotel-amenities")
@RequiredArgsConstructor
public class HotelAmenityController {

    private final HotelAmenityService service;

    @PostMapping
    public HotelAmenityResponse create(@Valid @RequestBody HotelAmenityRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<HotelAmenityResponse> getAll() {
        return service.getAll();
    }

    @GetMapping("/{hotelId}/{amenityId}")
    public HotelAmenityResponse getById(
            @PathVariable Long hotelId,
            @PathVariable Long amenityId
    ) {
        return service.getById(hotelId, amenityId);
    }

    @GetMapping("/hotel/{hotelId}")
    public List<HotelAmenityResponse> getByHotel(@PathVariable Long hotelId) {
        return service.getByHotel(hotelId);
    }

    @PutMapping
    public HotelAmenityResponse update(@Valid @RequestBody HotelAmenityRequest request) {
        return service.update(request);
    }

    @DeleteMapping("/{hotelId}/{amenityId}")
    public void delete(
            @PathVariable Long hotelId,
            @PathVariable Long amenityId
    ) {
        service.delete(hotelId, amenityId);
    }
}