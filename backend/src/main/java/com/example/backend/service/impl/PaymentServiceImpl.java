package com.example.backend.service.impl;

import com.example.backend.dto.request.PaymentRequest;
import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Payment;
import com.example.backend.mapper.PaymentMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final PaymentMapper paymentMapper;

    @Override
    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAll().stream().map(paymentMapper::toPaymentResponse).collect(Collectors.toList());
    }

    @Override
    public PaymentResponse getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .map(paymentMapper::toPaymentResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found id=" + id));
    }

    @Override
    public PaymentResponse createPayment(PaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking not found id=" + request.getBookingId()));
        Payment saved = paymentRepository.save(paymentMapper.toPayment(request, booking));
        return paymentMapper.toPaymentResponse(saved);
    }

    @Override
    public PaymentResponse updatePayment(Long id, PaymentRequest request) {
        Payment existing = paymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found id=" + id));
        if (request.getBookingId() != null) {
            Booking booking = bookingRepository.findById(request.getBookingId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking not found id=" + request.getBookingId()));
            existing.setBooking(booking);
        }
        if (request.getPaymentMethod() != null) existing.setPaymentMethod(request.getPaymentMethod());
        if (request.getTransactionId() != null) existing.setTransactionId(request.getTransactionId());
        if (request.getAmount() != null) existing.setAmount(request.getAmount());
        return paymentMapper.toPaymentResponse(paymentRepository.save(existing));
    }

    @Override
    public void deletePayment(Long id) {
        Payment existing = paymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found id=" + id));
        paymentRepository.delete(existing);
    }
}
