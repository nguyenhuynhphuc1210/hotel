package com.example.backend.service.impl;

import com.example.backend.dto.export.PaymentExport;
import com.example.backend.dto.response.PaymentResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.Payment;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentMethod;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.event.BookingEmailEvent;
import com.example.backend.mapper.PaymentMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.MomoService;
import com.example.backend.service.NotificationService;
import com.example.backend.service.PaymentService;
import com.example.backend.service.VNPayService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.Map;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final BookingRepository bookingRepository;
    private final RoomCalendarRepository roomCalendarRepository;
    private final VNPayService vnPayService;
    private final MomoService momoService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentResponse> getAllPayments(
            int page,
            int size,
            String keyword,
            PaymentStatus status,
            PaymentMethod method,
            Long hotelId,
            Long ownerId) {

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        String searchKeyword = null;
        if (keyword != null && !keyword.isBlank()) {
            searchKeyword = "%" + keyword.trim().toLowerCase() + "%";
        }

        String currentOwnerEmail = null;

        if (SecurityUtils.isHotelOwner()
                && !SecurityUtils.isAdmin()) {

            currentOwnerEmail = SecurityUtils.getCurrentUserEmail();

        } else if (!SecurityUtils.isAdmin()) {

            throw new AccessDeniedException(
                    "Bạn không có quyền truy cập");
        }

        return paymentRepository.searchPayments(
                searchKeyword,
                status,
                method,
                hotelId,
                ownerId,
                currentOwnerEmail,
                pageable)
                .map(paymentMapper::toPaymentResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportPaymentsToExcel(
            String keyword,
            PaymentStatus status,
            PaymentMethod method,
            Long hotelId,
            Long ownerId) throws IOException {

        String searchKeyword = null;
        if (keyword != null && !keyword.isBlank()) {
            searchKeyword = "%" + keyword.trim().toLowerCase() + "%";
        }

        String currentOwnerEmail = null;

        if (SecurityUtils.isHotelOwner() && !SecurityUtils.isAdmin()) {
            currentOwnerEmail = SecurityUtils.getCurrentUserEmail();
        } else if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Bạn không có quyền export dữ liệu");
        }

        List<PaymentExport> payments = paymentRepository.exportPayments(
                searchKeyword, status, method, hotelId, ownerId, currentOwnerEmail);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Payments Report");

        Font boldFont = workbook.createFont();
        boldFont.setBold(true);

        DataFormat format = workbook.createDataFormat();
        short moneyFormat = format.getFormat("#,##0");
        short dateFormat = format.getFormat("yyyy-mm-dd hh:mm:ss");

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(boldFont);
        headerStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(headerStyle);

        CellStyle textStyle = workbook.createCellStyle();
        textStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(textStyle);

        CellStyle centerStyle = workbook.createCellStyle();
        centerStyle.setAlignment(HorizontalAlignment.CENTER);
        centerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(centerStyle);

        CellStyle moneyStyle = workbook.createCellStyle();
        moneyStyle.setDataFormat(moneyFormat);
        moneyStyle.setAlignment(HorizontalAlignment.RIGHT);
        moneyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(moneyStyle);

        CellStyle dateStyle = workbook.createCellStyle();
        dateStyle.setDataFormat(dateFormat);
        dateStyle.setAlignment(HorizontalAlignment.CENTER);
        dateStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorders(dateStyle);

        CellStyle totalLabelStyle = workbook.createCellStyle();
        totalLabelStyle.cloneStyleFrom(centerStyle);
        totalLabelStyle.setFont(boldFont);
        totalLabelStyle.setAlignment(HorizontalAlignment.RIGHT);
        totalLabelStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        totalLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle totalMoneyStyle = workbook.createCellStyle();
        totalMoneyStyle.cloneStyleFrom(moneyStyle);
        totalMoneyStyle.setFont(boldFont);
        totalMoneyStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        totalMoneyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        String[] columns = {
                "Mã đặt phòng", "Khách sạn", "Tên khách hàng", "Phương thức thanh toán",
                "Mã giao dịch", "Số tiền (VND)", "Trạng thái", "Ngày thanh toán", "Ngày tạo"
        };

        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(20);

        for (int i = 0; i < columns.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (PaymentExport payment : payments) {
            Row row = sheet.createRow(rowNum++);

            Cell cell0 = row.createCell(0);
            cell0.setCellValue(payment.getBookingCode());
            cell0.setCellStyle(textStyle);

            Cell cell1 = row.createCell(1);
            cell1.setCellValue(payment.getHotelName());
            cell1.setCellStyle(textStyle);

            Cell cell2 = row.createCell(2);
            cell2.setCellValue(payment.getGuestName());
            cell2.setCellStyle(textStyle);

            Cell cell3 = row.createCell(3);
            cell3.setCellValue(payment.getPaymentMethod().name());
            cell3.setCellStyle(centerStyle);

            Cell cell4 = row.createCell(4);
            cell4.setCellValue(payment.getTransactionId() != null ? payment.getTransactionId() : "");
            cell4.setCellStyle(textStyle);

            Cell cell5 = row.createCell(5);
            cell5.setCellValue(payment.getAmount().doubleValue());
            cell5.setCellStyle(moneyStyle);

            totalAmount = totalAmount.add(payment.getAmount());

            Cell cell6 = row.createCell(6);
            cell6.setCellValue(payment.getStatus().name());
            cell6.setCellStyle(centerStyle);

            Cell cell7 = row.createCell(7);
            if (payment.getPaymentDate() != null) {
                cell7.setCellValue(java.sql.Timestamp.valueOf(payment.getPaymentDate()));
            } else {
                cell7.setCellValue("");
            }
            cell7.setCellStyle(dateStyle);

            Cell cell8 = row.createCell(8);
            if (payment.getCreatedAt() != null) {
                cell8.setCellValue(java.sql.Timestamp.valueOf(payment.getCreatedAt()));
            }
            cell8.setCellStyle(dateStyle);
        }

        Row totalRow = sheet.createRow(rowNum);
        totalRow.setHeightInPoints(20);

        for (int i = 0; i <= 4; i++) {
            Cell cell = totalRow.createCell(i);
            cell.setCellStyle(totalLabelStyle);
            if (i == 0)
                cell.setCellValue("Tổng:");
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum, rowNum, 0, 4));

        Cell totalValueCell = totalRow.createCell(5);
        totalValueCell.setCellValue(totalAmount.doubleValue());
        totalValueCell.setCellStyle(totalMoneyStyle);

        for (int i = 6; i <= 8; i++) {
            Cell cell = totalRow.createCell(i);
            cell.setCellStyle(totalLabelStyle);
        }

        for (int i = 0; i < columns.length; i++) {
            sheet.autoSizeColumn(i);
            int currentWidth = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, currentWidth + 1000);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();

        return outputStream.toByteArray();
    }

    private void setBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
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
                String transactionNo = request.getParameter("vnp_TransactionNo");

                handleSuccessfulPayment(
                        booking,
                        payment,
                        transactionNo);

            } else {
                String responseCode = request.getParameter("vnp_ResponseCode");

                String cancelledBy = "SYSTEM";
                String reason = "Thanh toán VNPay thất bại";

                if ("24".equals(responseCode)) {
                    cancelledBy = "CUSTOMER";
                    reason = "Khách hàng hủy giao dịch trên VNPay";
                } else if ("51".equals(responseCode)) {
                    reason = "Tài khoản không đủ số dư";
                } else if ("65".equals(responseCode)) {
                    reason = "Vượt hạn mức giao dịch";
                }

                handleFailedPayment(
                        booking,
                        payment,
                        reason,
                        cancelledBy);
            }
        }

        if (isSuccess) {
            return frontendUrl + "/booking/success?bookingCode=" + booking.getBookingCode() + "&id="
                    + booking.getId();
        } else {
            return frontendUrl + "/booking/failed?bookingCode=" + booking.getBookingCode() + "&id="
                    + booking.getId();
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
                String transId = request.getParameter("transId");
                handleSuccessfulPayment(booking, payment, transId);
            } else {
                Integer resultCode = Integer.valueOf(
                        request.getParameter("resultCode"));

                String cancelledBy = "SYSTEM";
                String reason = "Thanh toán MoMo thất bại";

                if (resultCode == 1006) {
                    cancelledBy = "CUSTOMER";
                    reason = "Khách hàng hủy giao dịch MoMo";
                }

                handleFailedPayment(
                        booking,
                        payment,
                        reason,
                        cancelledBy);
            }
        }

        if (isSuccess) {
            return frontendUrl + "/booking/success?bookingCode=" + booking.getBookingCode() + "&id="
                    + booking.getId();
        } else {
            return frontendUrl + "/booking/failed?bookingCode=" + booking.getBookingCode() + "&id="
                    + booking.getId();
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
                String transactionNo = request.getParameter("vnp_TransactionNo");
                handleSuccessfulPayment(booking, payment, transactionNo);
            } else {
                String responseCode = request.getParameter("vnp_ResponseCode");

                String cancelledBy = "SYSTEM";
                String reason = "Thanh toán VNPay thất bại";

                if ("24".equals(responseCode)) {
                    cancelledBy = "CUSTOMER";
                    reason = "Khách hàng hủy giao dịch trên VNPay";
                } else if ("51".equals(responseCode)) {
                    reason = "Tài khoản không đủ số dư";
                } else if ("65".equals(responseCode)) {
                    reason = "Vượt hạn mức giao dịch";
                }

                handleFailedPayment(
                        booking,
                        payment,
                        reason,
                        cancelledBy);
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

            if (payment.getStatus() == PaymentStatus.PAID
                    || payment.getStatus() == PaymentStatus.CANCELLED) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
            }

            Integer resultCode = (Integer) requestBody.get("resultCode");

            if (resultCode != null && resultCode == 0) {

                String transId = String.valueOf(requestBody.get("transId"));
                handleSuccessfulPayment(booking, payment, transId);

            } else {

                String cancelledBy = "SYSTEM";
                String reason = "Thanh toán MoMo thất bại";

                if (resultCode != null && resultCode == 1006) {
                    cancelledBy = "CUSTOMER";
                    reason = "Khách hàng hủy giao dịch MoMo";
                }

                handleFailedPayment(
                        booking,
                        payment,
                        reason,
                        cancelledBy);
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

    private void handleSuccessfulPayment(Booking booking, Payment payment, String transactionId) {
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setTransactionId(transactionId);
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

        try {
            String ownerEmail = booking.getHotel().getOwner().getEmail();
            String hotelName = booking.getHotel().getHotelName();

            String guestName = booking.getUser() != null ? booking.getUser().getFullName() : booking.getGuestName();
            
            String title = "🎉 Đơn đặt phòng mới đã thanh toán!";
            String message = String.format(
                "Khách hàng %s vừa thanh toán thành công đơn %s tại khách sạn %s. Số tiền: %,d VND.",
                guestName,
                booking.getBookingCode(),
                hotelName,
                booking.getTotalAmount().longValue()
            );

            notificationService.createNotification(ownerEmail, title, message);
        } catch (Exception e) {
            log.error("Lỗi khi gửi thông báo cho chủ khách sạn (Booking ID: {}): {}", booking.getId(), e.getMessage());
        }
    }

    private void handleFailedPayment(Booking booking, Payment payment, String reason, String cancelledBy) {
        payment.setStatus(PaymentStatus.CANCELLED);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(reason);
        booking.setCancelledBy(cancelledBy);
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

    @Override
    @Transactional
    public String retryPayment(Long bookingId, HttpServletRequest request) {
        Booking booking = getBooking(bookingId);
        Payment payment = getPayment(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING || payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể thanh toán lại cho đơn đặt phòng đang chờ thanh toán!");
        }

        String currentUserEmail = SecurityUtils.getCurrentUserEmail();
        if (booking.getUser() == null || !booking.getUser().getEmail().equals(currentUserEmail)) {
            throw new AccessDeniedException("Bạn không có quyền thực hiện thanh toán cho đơn này");
        }

        if (payment.getPaymentMethod() == PaymentMethod.VNPAY) {
            return vnPayService.createPaymentUrl(booking, request);
        } else if (payment.getPaymentMethod() == PaymentMethod.MOMO) {
            return momoService.createPaymentUrl(booking);
        }

        throw new IllegalArgumentException("Phương thức thanh toán không được hỗ trợ");
    }
}