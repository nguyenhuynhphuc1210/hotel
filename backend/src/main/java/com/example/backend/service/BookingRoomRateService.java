package com.example.backend.service;

import com.example.backend.dto.request.BookingRoomRateRequest;
import com.example.backend.dto.response.BookingRoomRateResponse;

import java.util.List;

public interface BookingRoomRateService {

    List<BookingRoomRateResponse> getAllBookingRoomRates();

    BookingRoomRateResponse getBookingRoomRateById(Long id);

    BookingRoomRateResponse createBookingRoomRate(BookingRoomRateRequest request);

    BookingRoomRateResponse updateBookingRoomRate(Long id, BookingRoomRateRequest request);

    void deleteBookingRoomRate(Long id);
}