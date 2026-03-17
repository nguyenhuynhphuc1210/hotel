package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.example.backend.enums.BookingStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private Long id;
    private String bookingCode;
    private Long userId;
    private String userEmail;
    private String guestEmail;
    private String guestName;
    private String guestPhone;
    private Long hotelId;
    private String hotelName;
    private String hotelAddress;
    private String hotelPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BookingStatus status;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private Long promotionId;
    private String promoCode;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<BookingRoomResponse> bookingRooms;
}