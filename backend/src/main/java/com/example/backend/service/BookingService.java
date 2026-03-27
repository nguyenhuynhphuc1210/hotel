package com.example.backend.service;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.dto.request.UpdateBookingStatusRequest;

import java.util.List;

public interface BookingService {

    BookingResponse createBooking(BookingRequest request);

    BookingResponse cancelBooking(Long bookingId);

    BookingResponse updateBookingStatus(Long bookingId, UpdateBookingStatusRequest request);

    List<BookingResponse> getBookingsForOwner();

    List<BookingResponse> getMyPersonalBookings();

    BookingResponse getBookingById(Long bookingId);

    BookingResponse lookupGuestBooking(String bookingCode, String email);
}
