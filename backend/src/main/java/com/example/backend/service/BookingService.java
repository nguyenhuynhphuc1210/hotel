package com.example.backend.service;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.request.CancelBookingRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.enums.BookingStatus;
import com.example.backend.dto.request.UpdateBookingStatusRequest;

import org.springframework.data.domain.Page;
import java.io.IOException;

public interface BookingService {

    BookingResponse createBooking(BookingRequest request);

    BookingResponse cancelBooking(Long bookingId, CancelBookingRequest request);

    BookingResponse updateBookingStatus(Long bookingId, UpdateBookingStatusRequest request);

    Page<BookingResponse> getBookingsForOwner(int page,
            int size,
            String keyword,
            BookingStatus status,
            Long hotelId,
            Long ownerId);

    Page<BookingResponse> getMyPersonalBookings(int page, int size);

    BookingResponse getBookingById(Long bookingId);

    BookingResponse lookupBooking(String bookingCode);

    byte[] exportBookingsToExcel(String keyword, BookingStatus status, Long hotelId, Long ownerId) throws IOException;
}
