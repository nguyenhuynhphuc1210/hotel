package com.example.backend.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentStatus;

import java.time.LocalDate;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentBookingResponse {

    private Long bookingId;
    private String bookingCode;
    private String guestName;
    private String hotelName;
    private BigDecimal totalAmount;
    private BigDecimal commissionAmount;
    private BigDecimal netAmount;
    private BookingStatus status;
    private PaymentStatus paymentStatus;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private LocalDateTime createdAt;
}
