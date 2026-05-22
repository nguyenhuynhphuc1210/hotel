package com.example.backend.service;

import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.enums.PaymentStatus;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import com.example.backend.enums.PaymentMethod;
import java.io.IOException;

public interface PaymentService {
    Page<PaymentResponse> getAllPayments(int page, int size,String keyword, PaymentStatus status, PaymentMethod method,
            Long hotelId, Long ownerId);

    byte[] exportPaymentsToExcel(String keyword, PaymentStatus status, PaymentMethod method, Long hotelId,
            Long ownerId) throws IOException;

    PaymentResponse getPaymentById(Long id);

    PaymentResponse getPaymentByBookingId(Long bookingId);

    String processVnPayReturn(HttpServletRequest request);

    String processMomoReturn(HttpServletRequest request);

    ResponseEntity<?> processVnPayIpn(HttpServletRequest request);

    ResponseEntity<?> processMomoIpn(Map<String, Object> requestBody);
}