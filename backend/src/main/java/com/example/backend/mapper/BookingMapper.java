package com.example.backend.mapper;

import com.example.backend.enums.BookingStatus;
import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Promotion;
import com.example.backend.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.UUID;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class BookingMapper {

        private final BookingRoomMapper bookingRoomMapper;

        public Booking toBooking(BookingRequest req,
                        User user,
                        Hotel hotel,
                        Promotion promotion,
                        List<BookingRoom> bookingRooms) {

                if (req == null)
                        return null;

                String finalGuestEmail = (user != null && user.getEmail() != null && !user.getEmail().isEmpty())
                                ? user.getEmail()
                                : req.getGuestEmail();

                String finalGuestName = (user != null && user.getFullName() != null && !user.getFullName().isEmpty())
                                ? user.getFullName()
                                : req.getGuestName();

                String finalGuestPhone = (user != null && user.getPhone() != null && !user.getPhone().isEmpty())
                                ? user.getPhone()
                                : req.getGuestPhone();

                return Booking.builder()
                                .bookingCode(generateBookingCode())

                                .user(user)

                                .guestEmail(finalGuestEmail)
                                .guestName(finalGuestName)
                                .guestPhone(finalGuestPhone)

                                .hotel(hotel)

                                .checkInDate(req.getCheckInDate())
                                .checkOutDate(req.getCheckOutDate())

                                .status(BookingStatus.PENDING)

                                .subtotal(BigDecimal.ZERO)
                                .discountAmount(BigDecimal.ZERO)
                                .totalAmount(BigDecimal.ZERO)

                                .promotion(promotion)

                                .bookingRooms(bookingRooms)

                                .build();
        }

        private String generateBookingCode() {
                return "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        public BookingResponse toBookingResponse(Booking b) {
                if (b == null)
                        return null;

                List<com.example.backend.dto.response.BookingRoomResponse> bookingRoomResponses = b
                                .getBookingRooms() == null
                                                ? Collections.emptyList()
                                                : b.getBookingRooms().stream()
                                                                .map(bookingRoomMapper::toBookingRoomResponse)
                                                                .collect(Collectors.toList());

                return BookingResponse.builder()
                                .id(b.getId())
                                .bookingCode(b.getBookingCode())
                                .userId(b.getUser() != null ? b.getUser().getId() : null)

                                .guestEmail(b.getGuestEmail())
                                .guestName(b.getGuestName())
                                .guestPhone(b.getGuestPhone())

                                .hotelId(b.getHotel() != null ? b.getHotel().getId() : null)
                                .hotelName(b.getHotel() != null ? b.getHotel().getHotelName() : null)
                                .hotelAddress(b.getHotel() != null ? b.getHotel().getAddressLine() : null)
                                .hotelPhone(b.getHotel() != null ? b.getHotel().getPhone() : null)
                                .checkInDate(b.getCheckInDate())
                                .checkOutDate(b.getCheckOutDate())
                                .status(b.getStatus())
                                .subtotal(b.getSubtotal())
                                .discountAmount(b.getDiscountAmount())
                                .promotionId(b.getPromotion() != null ? b.getPromotion().getId() : null)
                                .promoCode(b.getPromotion() != null ? b.getPromotion().getPromoCode() : null)
                                .totalAmount(b.getTotalAmount())
                                .createdAt(b.getCreatedAt())
                                .updatedAt(b.getUpdatedAt())
                                .bookingRooms(bookingRoomResponses)

                                .paymentMethod(b.getPayment() != null ? b.getPayment().getPaymentMethod() : null)
                                .paymentStatus(b.getPayment() != null ? b.getPayment().getStatus() : null)
                                .build();
        }
}