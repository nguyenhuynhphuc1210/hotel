package com.example.backend.service.impl;

import com.example.backend.dto.export.BookingExport;
import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.request.BookingRoomRequest;
import com.example.backend.dto.request.CancelBookingRequest;
import com.example.backend.dto.request.UpdateBookingStatusRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.*;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentMethod;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.event.BookingEmailEvent;
import com.example.backend.mapper.BookingMapper;
import com.example.backend.repository.*;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.BookingService;
import com.example.backend.service.HotelStatisticService;
import com.example.backend.service.MomoService;
import com.example.backend.service.NotificationService;
import com.example.backend.service.VNPayService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import lombok.extern.slf4j.Slf4j;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomCalendarRepository roomCalendarRepository;
    private final UserRepository userRepository;
    private final PromotionRepository promotionRepository;
    private final BookingMapper bookingMapper;
    private final PaymentRepository paymentRepository;
    private final HotelStatisticService hotelStatisticService;
    private final VNPayService vnPayService;
    private final MomoService momoService;
    private final HttpServletRequest requestServlet;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        if (!request.getCheckInDate().isBefore(request.getCheckOutDate())) {
            throw new IllegalArgumentException("Ngày check-out phải sau ngày check-in ít nhất 1 đêm");
        }

        User user = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            String currentUserEmail = auth.getName();
            user = userRepository.findByEmail(currentUserEmail)
                    .orElseThrow(() -> new EntityNotFoundException("Tài khoản không tồn tại hoặc đã bị khóa"));
        }

        if (user == null) {
            if (request.getGuestEmail() == null || request.getGuestEmail().trim().isEmpty()) {
                throw new IllegalArgumentException("Khách vãng lai bắt buộc phải nhập Email");
            }
            if (request.getGuestName() == null || request.getGuestName().trim().isEmpty()) {
                throw new IllegalArgumentException("Khách vãng lai bắt buộc phải nhập Tên");
            }
        }

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        Booking booking = bookingMapper.toBooking(request, user, hotel, null, new ArrayList<>());
        BigDecimal grandTotal = BigDecimal.ZERO;
        long expectedNights = request.getCheckOutDate().toEpochDay() - request.getCheckInDate().toEpochDay();

        for (BookingRoomRequest roomReq : request.getBookingRooms()) {
            RoomType roomType = roomTypeRepository.findById(roomReq.getRoomTypeId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng"));

            List<RoomCalendar> calendars = roomCalendarRepository.findAndLockByRoomType_IdAndDateBetween(
                    roomType.getId(),
                    request.getCheckInDate(),
                    request.getCheckOutDate().minusDays(1));

            if (calendars.size() != expectedNights) {
                throw new IllegalArgumentException("Hệ thống chưa có đủ lịch giá cho khoảng thời gian này");
            }

            BigDecimal roomTotalCost = BigDecimal.ZERO;
            BookingRoom bookingRoom = BookingRoom.builder()
                    .booking(booking)
                    .roomType(roomType)
                    .quantity(roomReq.getQuantity())
                    .rates(new ArrayList<>())
                    .build();

            for (RoomCalendar calendar : calendars) {
                if (!calendar.getIsAvailable()
                        || (calendar.getTotalRooms() - calendar.getBookedRooms() < roomReq.getQuantity())) {
                    throw new IllegalArgumentException(
                            "Loại phòng " + roomType.getTypeName() + " đã hết phòng trống vào ngày "
                                    + calendar.getDate());
                }

                calendar.setBookedRooms(calendar.getBookedRooms() + roomReq.getQuantity());

                BigDecimal nightlyCost = calendar.getPrice().multiply(BigDecimal.valueOf(roomReq.getQuantity()));
                roomTotalCost = roomTotalCost.add(nightlyCost);

                BookingRoomRate rate = BookingRoomRate.builder()
                        .bookingRoom(bookingRoom)
                        .date(calendar.getDate())
                        .price(calendar.getPrice())
                        .build();
                bookingRoom.getRates().add(rate);
            }

            bookingRoom.setPricePerNight(
                    roomTotalCost.divide(BigDecimal.valueOf(expectedNights), 2, RoundingMode.HALF_UP));
            booking.getBookingRooms().add(bookingRoom);
            grandTotal = grandTotal.add(roomTotalCost);
        }

        booking.setSubtotal(grandTotal);
        BigDecimal discount = BigDecimal.ZERO;
        if (request.getPromotionId() != null) {
            Promotion promo = promotionRepository.findById(request.getPromotionId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy mã giảm giá"));

            LocalDateTime now = LocalDateTime.now();
            if (!promo.getIsActive() || now.isBefore(promo.getStartDate()) || now.isAfter(promo.getEndDate())) {
                throw new IllegalArgumentException("Mã giảm giá đã hết hạn hoặc không hợp lệ");
            }

            if (promo.getHotel() != null && !promo.getHotel().getId().equals(hotel.getId())) {
                throw new IllegalArgumentException("Mã giảm giá này không áp dụng cho khách sạn này");
            }

            BigDecimal calculatedDiscount = grandTotal
                    .multiply(promo.getDiscountPercent().divide(BigDecimal.valueOf(100)));
            discount = (promo.getMaxDiscountAmount() != null
                    && calculatedDiscount.compareTo(promo.getMaxDiscountAmount()) > 0)
                            ? promo.getMaxDiscountAmount()
                            : calculatedDiscount;

            booking.setPromotion(promo);
        }

        booking.setDiscountAmount(discount);
        booking.setTotalAmount(grandTotal.subtract(discount));

        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            booking.setStatus(BookingStatus.CONFIRMED);
        } else {
            booking.setStatus(BookingStatus.PENDING);
        }

        Booking savedBooking = bookingRepository.save(booking);

        PaymentStatus initialPaymentStatus = (request.getPaymentMethod() == PaymentMethod.CASH)
                ? PaymentStatus.UNPAID
                : PaymentStatus.PENDING;

        Payment payment = Payment.builder()
                .booking(savedBooking)
                .paymentMethod(request.getPaymentMethod())
                .amount(savedBooking.getTotalAmount())
                .status(initialPaymentStatus)
                .build();

        savedBooking.setPayment(payment);
        paymentRepository.save(payment);

        BookingResponse response = bookingMapper.toBookingResponse(savedBooking);

        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            eventPublisher.publishEvent(new BookingEmailEvent(savedBooking.getId(), "CONFIRM", null));
        } else if (request.getPaymentMethod() == PaymentMethod.VNPAY) {
            String paymentUrl = vnPayService.createPaymentUrl(savedBooking, requestServlet);
            response.setPaymentUrl(paymentUrl);
        } else if (request.getPaymentMethod() == PaymentMethod.MOMO) {
            String paymentUrl = momoService.createPaymentUrl(savedBooking);
            response.setPaymentUrl(paymentUrl);
        }

        String customerName = user != null ? user.getFullName() : request.getGuestName();
        String notificationTitle = "Bạn có đơn đặt phòng mới";
        String notificationMessage = String.format(
                "%s đã đặt phòng tại %s từ %s đến %s.",
                customerName,
                hotel.getHotelName(),
                request.getCheckInDate(),
                request.getCheckOutDate());

        try {
            notificationService.createNotification(
                    hotel.getOwner().getEmail(),
                    notificationTitle,
                    notificationMessage);
        } catch (Exception ex) {
            log.error("Không thể tạo notification booking mới: {}", ex.getMessage());
        }

        return response;
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId, CancelBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthenticated = auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser");

        if (!isAuthenticated) {
            throw new AccessDeniedException("Vui lòng đăng nhập để thực hiện thao tác này.");
        }

        String cancelledBy = auth.getName();
        boolean isAdminOrOwner = SecurityUtils.isAdmin();

        if (!isAdminOrOwner) {
            boolean isOwnerOfThisHotel = booking.getHotel().getOwner().getEmail().equals(cancelledBy);
            boolean isGuestOfThisBooking = booking.getUser() != null
                    && booking.getUser().getEmail().equals(cancelledBy);

            if (isOwnerOfThisHotel) {
                isAdminOrOwner = true;
            }

            if (!isOwnerOfThisHotel && !isGuestOfThisBooking) {
                throw new AccessDeniedException("Bạn không có quyền hủy đơn đặt phòng này.");
            }
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalArgumentException("Không thể hủy đơn đặt phòng ở trạng thái hiện tại");
        }

        restoreRoomInventory(booking);

        String finalReason;
        if (request != null && request.getCancelReason() != null && !request.getCancelReason().isBlank()) {
            finalReason = request.getCancelReason().trim();
        } else {
            if (isAdminOrOwner) {
                finalReason = "Hủy bởi Quản trị viên / Chủ khách sạn";
            } else {
                finalReason = "Khách hàng thay đổi kế hoạch (Không cung cấp lý do cụ thể)";
            }
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(finalReason);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelledBy(cancelledBy);

        Booking savedBooking = bookingRepository.save(booking);

        hotelStatisticService.recordRealtimeStatistic(
                savedBooking.getHotel(),
                savedBooking.getTotalAmount(),
                LocalDate.now(),
                BookingStatus.CANCELLED);

        paymentRepository.findByBooking_Id(booking.getId()).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.PAID) {
                payment.setStatus(PaymentStatus.REFUNDED);
            } else if (payment.getStatus() == PaymentStatus.UNPAID || payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.CANCELLED);
            }
            paymentRepository.save(payment);
        });

        try {
            eventPublisher.publishEvent(
                    new BookingEmailEvent(savedBooking.getId(), "CANCEL", finalReason));
        } catch (Exception e) {
            log.error("Lỗi khi gửi email hủy phòng cho booking ID {}: {}", booking.getId(), e.getMessage());
        }

        String cancellationMessage = String.format(
                "%s đã hủy đơn đặt phòng %s.",
                savedBooking.getCancelledBy(),
                savedBooking.getBookingCode());
        try {
            notificationService.createNotification(
                    savedBooking.getHotel().getOwner().getEmail(),
                    "Đơn đặt phòng đã bị hủy",
                    cancellationMessage);
        } catch (Exception ex) {
            log.error("Không thể tạo notification hủy booking: {}", ex.getMessage());
        }

        return bookingMapper.toBookingResponse(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse updateBookingStatus(Long bookingId, UpdateBookingStatusRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));

        SecurityUtils.checkOwnerOrAdmin(booking.getHotel().getOwner().getEmail());

        BookingStatus newStatus = request.getStatus();
        BookingStatus currentStatus = booking.getStatus();

        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalArgumentException(
                    "Không thể chuyển trạng thái từ " + currentStatus + " sang " + newStatus);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED && newStatus != BookingStatus.CANCELLED) {
            throw new IllegalArgumentException("Đơn đã hủy không thể phục hồi trạng thái.");
        }

        if (newStatus == BookingStatus.CANCELLED && booking.getStatus() != BookingStatus.CANCELLED) {
            restoreRoomInventory(booking);

            String cancelReason = (request.getReason() != null && !request.getReason().isBlank())
                    ? request.getReason().trim()
                    : "Hủy bởi Quản trị viên / Chủ khách sạn (Chuyển trạng thái hệ thống)";

            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelReason(cancelReason);
            booking.setCancelledBy(SecurityUtils.getCurrentUserEmail());

            paymentRepository.findByBooking_Id(booking.getId()).ifPresent(payment -> {
                if (payment.getStatus() == PaymentStatus.PAID) {
                    payment.setStatus(PaymentStatus.REFUNDED);
                } else {
                    payment.setStatus(PaymentStatus.CANCELLED);
                }
                paymentRepository.save(payment);
            });

            try {
                eventPublisher.publishEvent(new BookingEmailEvent(booking.getId(), "CANCEL", cancelReason));
            } catch (Exception e) {

                log.error("Lỗi khi gửi email hủy phòng cho booking ID {}: {}", booking.getId(), e.getMessage());
            }
        }

        if (newStatus == BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.CHECKED_IN) {
            paymentRepository.findByBooking_Id(booking.getId()).ifPresent(payment -> {
                if (payment.getPaymentMethod() == PaymentMethod.CASH && payment.getStatus() == PaymentStatus.UNPAID) {
                    payment.setStatus(PaymentStatus.PAID);
                    payment.setPaymentDate(LocalDateTime.now());
                    paymentRepository.save(payment);
                }
            });
        }

        if (newStatus == BookingStatus.NO_SHOW && booking.getStatus() != BookingStatus.NO_SHOW) {
            restoreRoomInventory(booking);
            paymentRepository.findByBooking_Id(booking.getId()).ifPresent(payment -> {
                if (payment.getStatus() == PaymentStatus.PENDING
                        || payment.getStatus() == PaymentStatus.UNPAID) {
                    payment.setStatus(PaymentStatus.CANCELLED);
                }
                paymentRepository.save(payment);
            });
        }

        booking.setStatus(newStatus);
        Booking savedBooking = bookingRepository.save(booking);

        if (currentStatus != newStatus &&
                (newStatus == BookingStatus.COMPLETED || newStatus == BookingStatus.CANCELLED
                        || newStatus == BookingStatus.NO_SHOW)) {

            hotelStatisticService.recordRealtimeStatistic(
                    savedBooking.getHotel(),
                    savedBooking.getTotalAmount(),
                    LocalDate.now(),
                    newStatus);
        }

        return bookingMapper.toBookingResponse(savedBooking);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsForOwner(
            int page,
            int size,
            String keyword,
            BookingStatus status,
            Long hotelId,
            Long ownerId) {

        if (!SecurityUtils.isHotelOwner()
                && !SecurityUtils.isAdmin()) {

            throw new AccessDeniedException(
                    "Chỉ chủ khách sạn hoặc Admin mới được xem danh sách này");
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        String currentOwnerEmail = null;

        if (SecurityUtils.isHotelOwner()
                && !SecurityUtils.isAdmin()) {

            currentOwnerEmail = SecurityUtils.getCurrentUserEmail();
        }

        return bookingRepository
                .searchBookings(
                        keyword,
                        status,
                        hotelId,
                        ownerId,
                        currentOwnerEmail,
                        pageable)
                .map(bookingMapper::toBookingResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyPersonalBookings(int page, int size) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Booking> bookingPage = bookingRepository.findByUser_Id(currentUser.getId(), pageable);

        return bookingPage.map(bookingMapper::toBookingResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng với ID: " + bookingId));

        if (!SecurityUtils.isAdmin()) {
            String currentUserEmail = SecurityUtils.getCurrentUserEmail();

            boolean isOwnerOfThisHotel = booking.getHotel().getOwner().getEmail().equals(currentUserEmail);

            boolean isGuestOfThisBooking = booking.getUser() != null
                    && booking.getUser().getEmail().equals(currentUserEmail);

            if (!isOwnerOfThisHotel && !isGuestOfThisBooking) {
                throw new AccessDeniedException("Bạn không có quyền truy cập đơn đặt phòng này.");
            }
        }

        return bookingMapper.toBookingResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse lookupBooking(String bookingCode) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn"));
        return bookingMapper.toBookingResponse(booking);
    }

    private void restoreRoomInventory(Booking booking) {
        for (BookingRoom br : booking.getBookingRooms()) {
            for (BookingRoomRate rate : br.getRates()) {
                RoomCalendar calendar = roomCalendarRepository.findByRoomType_IdAndDate(
                        br.getRoomType().getId(), rate.getDate())
                        .orElseThrow(() -> new EntityNotFoundException("Lỗi hệ thống: Không tìm thấy lịch phòng"));

                int newBookedRooms = calendar.getBookedRooms() - br.getQuantity();
                calendar.setBookedRooms(Math.max(newBookedRooms, 0));
                roomCalendarRepository.save(calendar);
            }
        }
    }

    private boolean isValidTransition(BookingStatus current, BookingStatus next) {
        if (current == next)
            return true;

        return switch (current) {
            case PENDING ->
                next == BookingStatus.CONFIRMED
                        || next == BookingStatus.CANCELLED;

            case CONFIRMED ->
                next == BookingStatus.CHECKED_IN
                        || next == BookingStatus.CANCELLED
                        || next == BookingStatus.NO_SHOW;

            case CHECKED_IN ->
                next == BookingStatus.COMPLETED;

            case COMPLETED, CANCELLED, NO_SHOW ->
                false;

            default -> false;
        };
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportBookingsToExcel(
            String keyword,
            BookingStatus status,
            Long hotelId,
            Long ownerId) throws IOException {

        String currentOwnerEmail = null;

        if (SecurityUtils.isHotelOwner() && !SecurityUtils.isAdmin()) {
            currentOwnerEmail = SecurityUtils.getCurrentUserEmail();
        } else if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Bạn không có quyền export dữ liệu");
        }

        List<BookingExport> bookings = bookingRepository.exportBookings(
                keyword, status, hotelId, ownerId, currentOwnerEmail);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Bookings Report");

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
                "Booking Code", "Guest Name", "Guest Email", "Guest Phone",
                "Hotel", "Check In", "Check Out", "Status", "Payment Method",
                "Total Amount (VND)", "Created At"
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

        for (BookingExport booking : bookings) {
            Row row = sheet.createRow(rowNum++);

            Cell cell0 = row.createCell(0);
            cell0.setCellValue(booking.getBookingCode());
            cell0.setCellStyle(textStyle);

            Cell cell1 = row.createCell(1);
            cell1.setCellValue(booking.getGuestName());
            cell1.setCellStyle(textStyle);

            Cell cell2 = row.createCell(2);
            cell2.setCellValue(booking.getGuestEmail());
            cell2.setCellStyle(textStyle);

            Cell cell3 = row.createCell(3);
            cell3.setCellValue(booking.getGuestPhone() != null ? booking.getGuestPhone() : "");
            cell3.setCellStyle(centerStyle);

            Cell cell4 = row.createCell(4);
            cell4.setCellValue(booking.getHotelName());
            cell4.setCellStyle(textStyle);

            Cell cell5 = row.createCell(5);
            cell5.setCellValue(booking.getCheckInDate() != null ? booking.getCheckInDate().toString() : "");
            cell5.setCellStyle(centerStyle);

            Cell cell6 = row.createCell(6);
            cell6.setCellValue(booking.getCheckOutDate() != null ? booking.getCheckOutDate().toString() : "");
            cell6.setCellStyle(centerStyle);

            Cell cell7 = row.createCell(7);
            cell7.setCellValue(booking.getStatus().name());
            cell7.setCellStyle(centerStyle);

            Cell cell8 = row.createCell(8);
            cell8.setCellValue(booking.getPaymentMethod() != null ? booking.getPaymentMethod().name() : "N/A");
            cell8.setCellStyle(centerStyle);

            Cell cell9 = row.createCell(9);
            cell9.setCellValue(booking.getTotalAmount().doubleValue());
            cell9.setCellStyle(moneyStyle);

            totalAmount = totalAmount.add(booking.getTotalAmount());

            Cell cell10 = row.createCell(10);
            if (booking.getCreatedAt() != null) {
                cell10.setCellValue(java.sql.Timestamp.valueOf(booking.getCreatedAt()));
            }
            cell10.setCellStyle(dateStyle);
        }

        Row totalRow = sheet.createRow(rowNum);
        totalRow.setHeightInPoints(20);

        for (int i = 0; i <= 8; i++) {
            Cell cell = totalRow.createCell(i);
            cell.setCellStyle(totalLabelStyle);
            if (i == 0)
                cell.setCellValue("TOTAL AMOUNT:");
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum, rowNum, 0, 8));

        Cell totalValueCell = totalRow.createCell(9);
        totalValueCell.setCellValue(totalAmount.doubleValue());
        totalValueCell.setCellStyle(totalMoneyStyle);

        Cell emptyEndCell = totalRow.createCell(10);
        emptyEndCell.setCellStyle(totalLabelStyle);

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
}