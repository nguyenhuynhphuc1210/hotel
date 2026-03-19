package com.example.backend.mapper;

import com.example.backend.dto.request.BookingRoomRequest;
import com.example.backend.dto.response.BookingRoomRateResponse;
import com.example.backend.dto.response.BookingRoomResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.RoomType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class BookingRoomMapper {

    private final BookingRoomRateMapper bookingRoomRateMapper;

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

        List<BookingRoomRateResponse> rateResponses = br.getRates() == null
                ? Collections.emptyList()
                : br.getRates().stream()
                    .map(bookingRoomRateMapper::toBookingRoomRateResponse)
                    .collect(Collectors.toList());

        return BookingRoomResponse.builder()
                .id(br.getId())
                .bookingId(br.getBooking() != null ? br.getBooking().getId() : null)
                .roomTypeId(br.getRoomType() != null ? br.getRoomType().getId() : null)
                .roomTypeName(br.getRoomType() != null ? br.getRoomType().getTypeName() : null)
                .quantity(br.getQuantity())
                .pricePerNight(br.getPricePerNight())
                .rates(rateResponses) // Gắn danh sách giá chi tiết từng đêm vào đây
                .build();
    }
}