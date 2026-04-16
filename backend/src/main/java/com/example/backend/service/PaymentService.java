package com.example.backend.service;

import com.example.backend.dto.response.PaymentResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import java.util.Map;

public interface PaymentService {
    Page<PaymentResponse> getAllPayments(int page, int size);

    PaymentResponse getPaymentById(Long id);

    PaymentResponse getPaymentByBookingId(Long bookingId);

    String processVnPayReturn(HttpServletRequest request);

    String processMomoReturn(HttpServletRequest request);

    ResponseEntity<?> processVnPayIpn(HttpServletRequest request);

    ResponseEntity<?> processMomoIpn(Map<String, Object> requestBody);
}