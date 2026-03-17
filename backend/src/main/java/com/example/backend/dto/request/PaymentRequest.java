package com.example.backend.dto.request;

import com.example.backend.enums.PaymentMethod;

import lombok.*;

import java.math.BigDecimal;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    private Long bookingId;
    private PaymentMethod paymentMethod;
    private String transactionId;
    private BigDecimal amount;
}