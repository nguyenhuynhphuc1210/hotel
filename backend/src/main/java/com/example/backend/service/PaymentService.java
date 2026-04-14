package com.example.backend.service;

import com.example.backend.dto.response.PaymentResponse;
import org.springframework.data.domain.Page;

public interface PaymentService {
    Page<PaymentResponse> getAllPayments(int page, int size);
    
    PaymentResponse getPaymentById(Long id);

    PaymentResponse getPaymentByBookingId(Long bookingId);
}