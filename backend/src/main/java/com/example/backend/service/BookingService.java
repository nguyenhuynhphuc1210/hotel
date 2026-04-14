package com.example.backend.service;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.dto.request.UpdateBookingStatusRequest;

import org.springframework.data.domain.Page;

public interface BookingService {

    BookingResponse createBooking(BookingRequest request);

    BookingResponse cancelBooking(Long bookingId);

    BookingResponse updateBookingStatus(Long bookingId, UpdateBookingStatusRequest request);

    Page<BookingResponse> getBookingsForOwner(int page, int size);

    Page<BookingResponse> getMyPersonalBookings(int page, int size);

    BookingResponse getBookingById(Long bookingId);

    BookingResponse lookupGuestBooking(String bookingCode, String email);
}
