package com.example.backend.controller;

import com.example.backend.config.MomoConfig;
import com.example.backend.config.VNPayConfig;
import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.Payment;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.service.EmailService;
import com.example.backend.service.PaymentService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final RoomCalendarRepository roomCalendarRepository;
    private final EmailService emailService;

    @Value("${vnpay.secret-key}")
    private String secretKey;

    @GetMapping
    public ResponseEntity<Page<PaymentResponse>> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(paymentService.getAllPayments(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPaymentById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<PaymentResponse> getPaymentByBookingId(@PathVariable Long bookingId) {
        return ResponseEntity.ok(paymentService.getPaymentByBookingId(bookingId));
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<?> vnpayReturn(HttpServletRequest request) {
        Map<String, String> fields = new HashMap<>();

        for (Enumeration<String> params = request.getParameterNames(); params.hasMoreElements();) {
            String fieldName = params.nextElement();
            String fieldValue = request.getParameter(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                fields.put(fieldName, fieldValue);
            }
        }

        String vnp_SecureHash = request.getParameter("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        fields.remove("vnp_SecureHash");

        String signValue = VNPayConfig.hashAllFields(fields, secretKey);

        if (signValue.equals(vnp_SecureHash)) {

            String txnRef = request.getParameter("vnp_TxnRef");
            Long bookingId = Long.parseLong(txnRef.split("_")[0]);

            Booking booking = bookingRepository.findById(bookingId).orElse(null);
            Payment payment = paymentRepository.findByBooking_Id(bookingId).orElse(null);

            if (booking == null || payment == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy đơn hàng");
            }

            if ("00".equals(request.getParameter("vnp_ResponseCode"))) {

                payment.setStatus(PaymentStatus.PAID);
                payment.setPaymentDate(LocalDateTime.now());
                booking.setStatus(BookingStatus.CONFIRMED);

                booking.setPayment(payment);

                paymentRepository.save(payment);
                bookingRepository.save(booking);
                emailService.sendBookingConfirmationEmail(booking);

                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(
                                "http://localhost:3000/booking/success?bookingCode=" + booking.getBookingCode()))
                        .build();
            } else {

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

                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI
                                .create("http://localhost:3000/booking/failed?bookingCode=" + booking.getBookingCode()))
                        .build();
            }
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Sai chữ ký bảo mật! Phát hiện can thiệp dữ liệu.");
        }
    }

    @Value("${momo.secret-key}")
    private String momoSecretKey;

    @Value("${momo.access-key}")
    private String momoAccessKey;

    @GetMapping("/momo-return")
    public ResponseEntity<?> momoReturn(HttpServletRequest request) {

        String partnerCode = request.getParameter("partnerCode");
        String orderId = request.getParameter("orderId");
        String requestId = request.getParameter("requestId");
        String amount = request.getParameter("amount");
        String orderInfo = request.getParameter("orderInfo");
        String orderType = request.getParameter("orderType");
        String transId = request.getParameter("transId");
        String resultCode = request.getParameter("resultCode");
        String message = request.getParameter("message");
        String payType = request.getParameter("payType");
        String responseTime = request.getParameter("responseTime");
        String extraData = request.getParameter("extraData");
        String signature = request.getParameter("signature");

        String rawHash = "accessKey=" + momoAccessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;

        String signValue = MomoConfig.hmacSHA256(rawHash, momoSecretKey);

        if (signValue.equals(signature)) {
            Long bookingId = Long.parseLong(orderId.split("_")[0]);
            Booking booking = bookingRepository.findById(bookingId).orElse(null);
            Payment payment = paymentRepository.findByBooking_Id(bookingId).orElse(null);

            if (booking == null || payment == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy đơn hàng");
            }

            if ("0".equals(resultCode)) {
                payment.setStatus(PaymentStatus.PAID);
                payment.setPaymentDate(LocalDateTime.now());
                booking.setStatus(BookingStatus.CONFIRMED);

                booking.setPayment(payment);
                paymentRepository.save(payment);
                bookingRepository.save(booking);
                emailService.sendBookingConfirmationEmail(booking);

                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(
                                "http://localhost:3000/booking/success?bookingCode=" + booking.getBookingCode()))
                        .build();
            } else {
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

                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI
                                .create("http://localhost:3000/booking/failed?bookingCode=" + booking.getBookingCode()))
                        .build();
            }
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Sai chữ ký MoMo! Phát hiện can thiệp dữ liệu.");
        }
    }
}