package com.example.backend.mapper;

import com.example.backend.dto.request.BookingRoomRateRequest;
import com.example.backend.dto.response.BookingRoomRateResponse;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.BookingRoomRate;
import org.springframework.stereotype.Component;

@Component
public class BookingRoomRateMapper {
    public BookingRoomRate toBookingRoomRate(BookingRoomRateRequest req, BookingRoom bookingRoom) {
        if (req == null) return null;
        return BookingRoomRate.builder()
                .bookingRoom(bookingRoom)
                .date(req.getDate())
                .price(req.getPrice())
                .build();
    }

    public BookingRoomRateResponse toBookingRoomRateResponse(BookingRoomRate r) {
        if (r == null) return null;
        return BookingRoomRateResponse.builder()
                .id(r.getId())
                .bookingRoomId(r.getBookingRoom() != null ? r.getBookingRoom().getId() : null)
                .roomTypeId(r.getBookingRoom() != null && r.getBookingRoom().getRoomType() != null ? r.getBookingRoom().getRoomType().getId() : null)
                .date(r.getDate())
                .price(r.getPrice())
                .build();
    }
}
