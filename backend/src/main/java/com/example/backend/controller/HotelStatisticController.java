package com.example.backend.controller;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.service.HotelStatisticService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class HotelStatisticController {

    private final HotelStatisticService service;

    @GetMapping
    public ResponseEntity<List<HotelStatisticResponse>> getStats(@Valid HotelStatisticRequest request) {
        return ResponseEntity.ok(service.getStatistics(request));
    }
}