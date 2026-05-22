package com.example.backend.dto.export;

import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentMethod; // IMPORT THÊM
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class BookingExport {

    private String bookingCode;
    private String guestName;
    private String guestEmail;
    private String guestPhone;
    private String hotelName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BookingStatus status;
    private PaymentMethod paymentMethod;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
}