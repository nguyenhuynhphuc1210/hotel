package com.example.backend.controller;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.request.UpdateBookingStatusRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        BookingResponse response = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/admin")
    public ResponseEntity<List<BookingResponse>> getBookingsForOwner() {
        return ResponseEntity.ok(bookingService.getBookingsForOwner());
    }

    @GetMapping("/me")
    public ResponseEntity<List<BookingResponse>> getMyPersonalBookings() {
        return ResponseEntity.ok(bookingService.getMyPersonalBookings());
    }

    @GetMapping("/lookup")
    public ResponseEntity<BookingResponse> lookupGuestBooking(
            @RequestParam String bookingCode,
            @RequestParam String email) {
        return ResponseEntity.ok(bookingService.lookupGuestBooking(bookingCode, email));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelBooking(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BookingResponse> updateBookingStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBookingStatusRequest request) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getBookingById(id));
    }
}