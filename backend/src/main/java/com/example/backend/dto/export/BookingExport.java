package com.example.backend.dto.export;

import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentMethod;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
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

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private BigDecimal commissionAmount;
    private Long promoId;
    private Long promoHotelId;
    private LocalDateTime createdAt;

    private BigDecimal hotelGrossAmount;
    private BigDecimal actualCommission;
    private BigDecimal hotelNetAmount;

    public BookingExport(
            String bookingCode, 
            String guestName, 
            String guestEmail, 
            String guestPhone,
            String hotelName, 
            LocalDate checkInDate, 
            LocalDate checkOutDate,
            BookingStatus status, 
            PaymentMethod paymentMethod,
            BigDecimal subtotal, 
            BigDecimal discountAmount, 
            BigDecimal totalAmount,
            BigDecimal commissionAmount, 
            Long promoId, 
            Long promoHotelId,
            LocalDateTime createdAt) {
            
        this.bookingCode = bookingCode;
        this.guestName = guestName;
        this.guestEmail = guestEmail;
        this.guestPhone = guestPhone;
        this.hotelName = hotelName;
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.status = status;
        this.paymentMethod = paymentMethod;
        this.subtotal = subtotal;
        this.discountAmount = discountAmount;
        this.totalAmount = totalAmount;
        this.commissionAmount = commissionAmount;
        this.promoId = promoId;
        this.promoHotelId = promoHotelId;
        this.createdAt = createdAt;
    }
}