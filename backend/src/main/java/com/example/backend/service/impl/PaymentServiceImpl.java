package com.example.backend.service.impl;

import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.Payment;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.event.BookingEmailEvent;
import com.example.backend.mapper.PaymentMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.MomoService;
import com.example.backend.service.PaymentService;
import com.example.backend.service.VNPayService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.Map;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final BookingRepository bookingRepository;
    private final RoomCalendarRepository roomCalendarRepository;
    private final VNPayService vnPayService;
    private final MomoService momoService;
    private final ApplicationEventPublisher eventPublisher;

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

    @Override
    @Transactional
    public String processVnPayReturn(HttpServletRequest request) {
        if (!vnPayService.verifySignature(request)) {
            throw new IllegalArgumentException("Sai chữ ký bảo mật VNPay! Phát hiện can thiệp dữ liệu.");
        }

        String txnRef = request.getParameter("vnp_TxnRef");
        Long bookingId = Long.parseLong(txnRef.split("_")[0]);
        Booking booking = getBooking(bookingId);
        Payment payment = getPayment(bookingId);

        boolean isSuccess = "00".equals(request.getParameter("vnp_ResponseCode"));

        if (payment.getStatus() == PaymentStatus.PENDING) {
            if (isSuccess) {
                handleSuccessfulPayment(booking, payment);
            } else {
                handleFailedPayment(booking, payment);
            }
        }

        if (isSuccess) {
            return "http://localhost:3000/booking/success?bookingCode=" + booking.getBookingCode();
        } else {
            return "http://localhost:3000/booking/failed?bookingCode=" + booking.getBookingCode();
        }
    }

    @Override
    @Transactional
    public String processMomoReturn(HttpServletRequest request) {
        if (!momoService.verifySignature(request)) {
            throw new IllegalArgumentException("Sai chữ ký bảo mật MoMo! Phát hiện can thiệp dữ liệu.");
        }

        String orderId = request.getParameter("orderId");
        Long bookingId = Long.parseLong(orderId.split("_")[0]);
        Booking booking = getBooking(bookingId);
        Payment payment = getPayment(bookingId);

        boolean isSuccess = "0".equals(request.getParameter("resultCode"));

        if (payment.getStatus() == PaymentStatus.PENDING) {
            if (isSuccess) {
                handleSuccessfulPayment(booking, payment);
            } else {
                handleFailedPayment(booking, payment);
            }
        }

        if (isSuccess) {
            return "http://localhost:3000/booking/success?bookingCode=" + booking.getBookingCode();
        } else {
            return "http://localhost:3000/booking/failed?bookingCode=" + booking.getBookingCode();
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> processVnPayIpn(HttpServletRequest request) {
        try {
            if (!vnPayService.verifySignature(request)) {
                return ResponseEntity.ok(Map.of("RspCode", "97", "Message", "Invalid Checksum"));
            }

            String txnRef = request.getParameter("vnp_TxnRef");
            Long bookingId = Long.parseLong(txnRef.split("_")[0]);

            Booking booking = bookingRepository.findById(bookingId).orElse(null);
            Payment payment = paymentRepository.findByBooking_Id(bookingId).orElse(null);

            if (booking == null || payment == null) {
                return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
            }

            if (payment.getStatus() == PaymentStatus.PAID || payment.getStatus() == PaymentStatus.CANCELLED) {

                return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already confirmed"));
            }

            if ("00".equals(request.getParameter("vnp_ResponseCode"))) {
                handleSuccessfulPayment(booking, payment);
            } else {
                handleFailedPayment(booking, payment);
            }

            return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));

        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("RspCode", "99", "Message", "Unknown error"));
        }
    }

    @Override
    @Transactional
    public ResponseEntity<?> processMomoIpn(Map<String, Object> requestBody) {
        try {
            if (!momoService.verifyIpnSignature(requestBody)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }

            String orderId = (String) requestBody.get("orderId");
            Long bookingId = Long.parseLong(orderId.split("_")[0]);

            Booking booking = bookingRepository.findById(bookingId).orElse(null);
            Payment payment = paymentRepository.findByBooking_Id(bookingId).orElse(null);

            if (booking == null || payment == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            if (payment.getStatus() == PaymentStatus.PAID || payment.getStatus() == PaymentStatus.CANCELLED) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            }

            Integer resultCode = (Integer) requestBody.get("resultCode");
            if (resultCode != null && resultCode == 0) {
                handleSuccessfulPayment(booking, payment);
            } else {
                handleFailedPayment(booking, payment);
            }

            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private Booking getBooking(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));
    }

    private Payment getPayment(Long bookingId) {
        return paymentRepository.findByBooking_Id(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy giao dịch thanh toán"));
    }

    private void handleSuccessfulPayment(Booking booking, Payment payment) {
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPayment(payment);

        paymentRepository.save(payment);
        bookingRepository.save(booking);
        try {
            eventPublisher.publishEvent(
                    new BookingEmailEvent(booking.getId(), "CONFIRM", null));
        } catch (Exception e) {
            System.err.println("Lỗi gửi email: " + e.getMessage());
        }
    }

    private void handleFailedPayment(Booking booking, Payment payment) {
        payment.setStatus(PaymentStatus.CANCELLED);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setPayment(payment);

        for (BookingRoom br : booking.getBookingRooms()) {
            List<RoomCalendar> calendars = roomCalendarRepository.findByRoomType_IdAndDateBetween(
                    br.getRoomType().getId(),
                    booking.getCheckInDate(),
                    booking.getCheckOutDate().minusDays(1));

            for (RoomCalendar calendar : calendars) {
                calendar.setBookedRooms(calendar.getBookedRooms() - br.getQuantity());
            }
            roomCalendarRepository.saveAll(calendars);
        }

        paymentRepository.save(payment);
        bookingRepository.save(booking);
    }
}