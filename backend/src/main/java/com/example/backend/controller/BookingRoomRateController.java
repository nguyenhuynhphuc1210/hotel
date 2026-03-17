package com.example.backend.controller;

import com.example.backend.dto.request.BookingRoomRateRequest;
import com.example.backend.dto.response.BookingRoomRateResponse;
import com.example.backend.service.BookingRoomRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/booking-room-rates")
@RequiredArgsConstructor
public class BookingRoomRateController {

    private final BookingRoomRateService bookingRoomRateService;

    @GetMapping
    public ResponseEntity<List<BookingRoomRateResponse>> getAll() {
        return ResponseEntity.ok(bookingRoomRateService.getAllBookingRoomRates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingRoomRateResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingRoomRateService.getBookingRoomRateById(id));
    }

    @PostMapping
    public ResponseEntity<BookingRoomRateResponse> create(
             @Valid @RequestBody BookingRoomRateRequest request) {

        BookingRoomRateResponse created =
                bookingRoomRateService.createBookingRoomRate(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookingRoomRateResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody BookingRoomRateRequest request) {

        return ResponseEntity.ok(
                bookingRoomRateService.updateBookingRoomRate(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {

        bookingRoomRateService.deleteBookingRoomRate(id);

        return ResponseEntity.noContent().build();
    }
}