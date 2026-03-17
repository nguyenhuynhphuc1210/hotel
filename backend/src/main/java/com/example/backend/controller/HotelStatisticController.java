package com.example.backend.controller;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.service.HotelStatisticService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotel-statistics")
@RequiredArgsConstructor
public class HotelStatisticController {

    private final HotelStatisticService hotelStatisticService;

    @GetMapping
    public ResponseEntity<List<HotelStatisticResponse>> getAll(@ModelAttribute HotelStatisticRequest request) {
        return ResponseEntity.ok(hotelStatisticService.getHotelStatistics(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelStatisticResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(hotelStatisticService.getHotelStatisticById(id));
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        hotelStatisticService.deleteHotelStatistic(id);
        return ResponseEntity.noContent().build();
    }
}
