package com.example.backend.service;

import com.example.backend.dto.request.PaymentRequest;
import com.example.backend.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {
    List<PaymentResponse> getAllPayments();
    PaymentResponse getPaymentById(Long id);
    PaymentResponse createPayment(PaymentRequest request);
    PaymentResponse updatePayment(Long id, PaymentRequest request);
    void deletePayment(Long id);
}
