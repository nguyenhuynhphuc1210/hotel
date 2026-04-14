package com.example.backend.service.impl;

import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.entity.Payment;
import com.example.backend.mapper.PaymentMapper;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.PaymentService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentResponse> getAllPayments(int page, int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Payment> payments;

        if (SecurityUtils.isAdmin()) {
            payments = paymentRepository.findAll(pageable);
            
        } else if (SecurityUtils.isHotelOwner()) {
            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            payments = paymentRepository.findByBooking_Hotel_Owner_Email(ownerEmail, pageable);
            
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập danh sách thanh toán");
        }

        return payments.map(paymentMapper::toPaymentResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)

                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy giao dịch thanh toán với ID = " + id));

        checkPaymentAccess(payment);
        return paymentMapper.toPaymentResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByBookingId(Long bookingId) {
        Payment payment = paymentRepository.findByBooking_Id(bookingId)

                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy giao dịch thanh toán cho đơn đặt phòng ID = " + bookingId));

        checkPaymentAccess(payment);
        return paymentMapper.toPaymentResponse(payment);
    }

    private void checkPaymentAccess(Payment payment) {
        if (SecurityUtils.isAdmin()) {
            return;
        }

        String currentUserEmail = SecurityUtils.getCurrentUserEmail();
        boolean isOwnerOfThisHotel = payment.getBooking().getHotel().getOwner().getEmail().equals(currentUserEmail);
        boolean isGuestOfThisBooking = payment.getBooking().getUser() != null
                && payment.getBooking().getUser().getEmail().equals(currentUserEmail);

        if (!isOwnerOfThisHotel && !isGuestOfThisBooking) {
            throw new AccessDeniedException("Bạn không có quyền xem chi tiết giao dịch thanh toán này");
        }
    }  
}