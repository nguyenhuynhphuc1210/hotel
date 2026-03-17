package com.example.backend.service.impl;

import com.example.backend.dto.request.BookingRoomRateRequest;
import com.example.backend.dto.response.BookingRoomRateResponse;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.BookingRoomRate;
import com.example.backend.mapper.BookingRoomRateMapper;
import com.example.backend.repository.BookingRoomRateRepository;
import com.example.backend.repository.BookingRoomRepository;
import com.example.backend.service.BookingRoomRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingRoomRateServiceImpl implements BookingRoomRateService {

    private final BookingRoomRateRepository bookingRoomRateRepository;
    private final BookingRoomRepository bookingRoomRepository;
    private final BookingRoomRateMapper bookingRoomRateMapper;

    @Override
    public List<BookingRoomRateResponse> getAllBookingRoomRates() {
        return bookingRoomRateRepository.findAll()
                .stream()
                .map(bookingRoomRateMapper::toBookingRoomRateResponse)
                .collect(Collectors.toList());
    }

    @Override
    public BookingRoomRateResponse getBookingRoomRateById(Long id) {
        return bookingRoomRateRepository.findById(id)
                .map(bookingRoomRateMapper::toBookingRoomRateResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "BookingRoomRate not found id=" + id));
    }

    @Override
    public BookingRoomRateResponse createBookingRoomRate(BookingRoomRateRequest request) {

        BookingRoom bookingRoom = bookingRoomRepository.findById(request.getBookingRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "BookingRoom not found id=" + request.getBookingRoomId()));

        BookingRoomRate saved = bookingRoomRateRepository.save(
                bookingRoomRateMapper.toBookingRoomRate(request, bookingRoom)
        );

        return bookingRoomRateMapper.toBookingRoomRateResponse(saved);
    }

    @Override
    public BookingRoomRateResponse updateBookingRoomRate(Long id, BookingRoomRateRequest request) {

        BookingRoomRate existing = bookingRoomRateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "BookingRoomRate not found id=" + id));

        if (request.getBookingRoomId() != null) {
            BookingRoom bookingRoom = bookingRoomRepository.findById(request.getBookingRoomId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "BookingRoom not found id=" + request.getBookingRoomId()));

            existing.setBookingRoom(bookingRoom);
        }

        if (request.getDate() != null) {
            existing.setDate(request.getDate());
        }

        if (request.getPrice() != null) {
            existing.setPrice(request.getPrice());
        }

        return bookingRoomRateMapper.toBookingRoomRateResponse(
                bookingRoomRateRepository.save(existing)
        );
    }

    @Override
    public void deleteBookingRoomRate(Long id) {

        BookingRoomRate existing = bookingRoomRateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "BookingRoomRate not found id=" + id));

        bookingRoomRateRepository.delete(existing);
    }
}