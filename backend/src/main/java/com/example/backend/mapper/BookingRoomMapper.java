package com.example.backend.mapper;

import com.example.backend.dto.request.BookingRoomRequest;
import com.example.backend.dto.response.BookingRoomResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.RoomType;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

@Component
public class BookingRoomMapper {
    public BookingRoom toBookingRoom(BookingRoomRequest req, Booking booking, RoomType roomType,
            BigDecimal pricePerNight) {
        if (req == null)
            return null;
        return BookingRoom.builder()
                .booking(booking)
                .roomType(roomType)
                .quantity(req.getQuantity())
                .pricePerNight(pricePerNight)
                .build();
    }

    public BookingRoomResponse toBookingRoomResponse(BookingRoom br) {
        if (br == null)
            return null;
        return BookingRoomResponse.builder()
                .id(br.getId())
                .bookingId(br.getBooking() != null ? br.getBooking().getId() : null)
                .roomTypeId(br.getRoomType() != null ? br.getRoomType().getId() : null)
                .roomTypeName(br.getRoomType() != null ? br.getRoomType().getTypeName() : null)
                .quantity(br.getQuantity())
                .pricePerNight(br.getPricePerNight())
                .build();
    }
}
