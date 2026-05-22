package com.example.backend.controller;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.DashboardResponse;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.service.HotelStatisticService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.io.IOException;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class HotelStatisticController {

        private final HotelStatisticService hotelStatisticService;

        @GetMapping
        public ResponseEntity<List<HotelStatisticResponse>> getStatistics(
                        @Valid @ModelAttribute HotelStatisticRequest request) {

                return ResponseEntity.ok(
                                hotelStatisticService.getStatistics(request));
        }

        @GetMapping("/export")
        @PreAuthorize("hasRole('ADMIN') or hasRole('HOTEL_OWNER')")
        public ResponseEntity<byte[]> exportRevenue(
                        @RequestParam(required = false) Long hotelId,
                        @RequestParam(required = false) Long ownerId,
                        @RequestParam(required = false) Integer month,
                        @RequestParam(required = false) Integer year,
                        @RequestParam(required = false) LocalDate fromDate,
                        @RequestParam(required = false) LocalDate toDate)
                        throws IOException {

                byte[] excelData = hotelStatisticService.exportRevenueToExcel(
                                hotelId,
                                ownerId,
                                month,
                                year,
                                fromDate,
                                toDate);

                return ResponseEntity.ok()
                                .header(
                                                HttpHeaders.CONTENT_DISPOSITION,
                                                "attachment; filename=revenue.xlsx")
                                .contentType(
                                                MediaType.parseMediaType(
                                                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                                .body(excelData);
        }

        @GetMapping("/dashboard")
        @PreAuthorize("hasRole('ADMIN') or hasRole('HOTEL_OWNER')")
        public ResponseEntity<DashboardResponse> getDashboard(
                        @RequestParam(required = false) Long hotelId,
                        @RequestParam(required = false) Long ownerId,
                        @RequestParam(required = false) Integer month,
                        @RequestParam(required = false) Integer year,
                        @RequestParam(required = false) LocalDate fromDate,
                        @RequestParam(required = false) LocalDate toDate) {

                return ResponseEntity.ok(hotelStatisticService.getDashboardData(
                                hotelId, ownerId, month, year, fromDate, toDate));
        }
}