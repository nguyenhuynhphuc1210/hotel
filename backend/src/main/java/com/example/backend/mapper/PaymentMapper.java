package com.example.backend.mapper;

import com.example.backend.dto.request.PaymentRequest;
import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {
    public Payment toPayment(PaymentRequest req, Booking booking) {
        if (req == null)
            return null;
        return Payment.builder()
                .booking(booking)
                .paymentMethod(req.getPaymentMethod())
                .transactionId(req.getTransactionId())
                .amount(req.getAmount())
                .status(com.example.backend.enums.PaymentStatus.PENDING)
                .build();
    }

    public PaymentResponse toPaymentResponse(Payment p) {
        if (p == null)
            return null;
        return PaymentResponse.builder()
                .id(p.getId())
                .hotelId(p.getBooking() != null && p.getBooking().getHotel() != null ? p.getBooking().getHotel().getId() : null)
                .hotelName(p.getBooking() != null && p.getBooking().getHotel() != null ? p.getBooking().getHotel().getHotelName() : null)
                .bookingId(p.getBooking() != null ? p.getBooking().getId() : null)
                .bookingCode(p.getBooking() != null ? p.getBooking().getBookingCode() : null)
                .paymentMethod(p.getPaymentMethod())
                .transactionId(p.getTransactionId())
                .amount(p.getAmount())
                .status(p.getStatus())
                .paymentDate(p.getPaymentDate())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
