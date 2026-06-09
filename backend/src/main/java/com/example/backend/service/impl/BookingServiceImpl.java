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
import org.springframework.beans.factory.annotation.Value;
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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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

    @Value("${app.system.commission-percent}")
    private BigDecimal systemCommissionPercent;

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
        booking.setCommissionPercent(systemCommissionPercent);

        BigDecimal commissionBaseAmount;
        if (booking.getPromotion() != null) {
            if (booking.getPromotion().getHotel() == null) {
                commissionBaseAmount = grandTotal;
            } else {
                commissionBaseAmount = booking.getTotalAmount();
            }
        } else {
            commissionBaseAmount = grandTotal;
        }

        booking.setCommissionAmount(
                commissionBaseAmount
                        .multiply(systemCommissionPercent)
                        .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)
                        .setScale(2, RoundingMode.HALF_UP));

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

        BookingResponse response = enrichBookingResponse(savedBooking);

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
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        String notificationMessage = String.format(
                "%s đã đặt phòng tại %s từ %s đến %s.",
                customerName,
                hotel.getHotelName(),
                request.getCheckInDate().format(formatter),
                request.getCheckOutDate().format(formatter));

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
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy đơn đặt phòng"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        boolean isAuthenticated = auth != null
                && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getName());

        if (!isAuthenticated) {
            throw new AccessDeniedException(
                    "Vui lòng đăng nhập để thực hiện thao tác này.");
        }

        String currentUserEmail = auth.getName();

        boolean isAdmin = SecurityUtils.isAdmin();

        boolean isOwner = booking.getHotel()
                .getOwner()
                .getEmail()
                .equals(currentUserEmail);

        boolean isCustomer = booking.getUser() != null
                && booking.getUser()
                        .getEmail()
                        .equals(currentUserEmail);

        if (!isAdmin && !isOwner && !isCustomer) {
            throw new AccessDeniedException(
                    "Bạn không có quyền hủy đơn đặt phòng này.");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.COMPLETED) {

            throw new IllegalArgumentException(
                    "Không thể hủy đơn đặt phòng ở trạng thái hiện tại");
        }

        restoreRoomInventory(booking);

        String cancelledBy;
        String finalReason;

        if (isAdmin) {
            cancelledBy = "ADMIN";
        } else if (isOwner) {
            cancelledBy = "OWNER";
        } else {
            cancelledBy = "CUSTOMER";
        }

        if (request != null
                && request.getCancelReason() != null
                && !request.getCancelReason().isBlank()) {

            finalReason = request.getCancelReason().trim();

        } else {

            switch (cancelledBy) {
                case "ADMIN" ->
                    finalReason = "Đơn đặt phòng bị hủy bởi quản trị viên";

                case "OWNER" ->
                    finalReason = "Đơn đặt phòng bị hủy bởi chủ khách sạn";

                default ->
                    finalReason = "Khách hàng thay đổi kế hoạch";
            }
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(finalReason);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelledBy(cancelledBy);

        Booking savedBooking = bookingRepository.save(booking);

        hotelStatisticService.recordRealtimeStatistic(
                savedBooking.getHotel(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                LocalDate.now(),
                BookingStatus.CANCELLED);

        paymentRepository.findByBooking_Id(savedBooking.getId())
                .ifPresent(payment -> {

                    if (payment.getStatus() == PaymentStatus.PAID) {
                        payment.setStatus(PaymentStatus.REFUNDED);
                    } else if (payment.getStatus() == PaymentStatus.UNPAID
                            || payment.getStatus() == PaymentStatus.PENDING) {
                        payment.setStatus(PaymentStatus.CANCELLED);
                    }

                    paymentRepository.save(payment);
                });

        try {
            eventPublisher.publishEvent(
                    new BookingEmailEvent(
                            savedBooking.getId(),
                            "CANCEL",
                            finalReason));
        } catch (Exception e) {
            log.error(
                    "Lỗi khi gửi email hủy phòng cho booking ID {}: {}",
                    savedBooking.getId(),
                    e.getMessage());
        }

        String actor = switch (cancelledBy) {
            case "ADMIN" -> "Quản trị viên";
            case "OWNER" -> "Chủ khách sạn";
            default -> "Khách hàng";
        };

        String cancellationMessage = String.format(
                "%s đã hủy đơn đặt phòng %s.",
                actor,
                savedBooking.getBookingCode());

        try {
            notificationService.createNotification(
                    savedBooking.getHotel().getOwner().getEmail(),
                    "Đơn đặt phòng đã bị hủy",
                    cancellationMessage);
        } catch (Exception ex) {
            log.error(
                    "Không thể tạo notification hủy booking: {}",
                    ex.getMessage());
        }

        return enrichBookingResponse(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse updateBookingStatus(
            Long bookingId,
            UpdateBookingStatusRequest request) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy đơn đặt phòng"));

        SecurityUtils.checkOwnerOrAdmin(
                booking.getHotel().getOwner().getEmail());

        BookingStatus currentStatus = booking.getStatus();
        BookingStatus newStatus = request.getStatus();

        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalArgumentException(
                    "Không thể chuyển trạng thái từ "
                            + currentStatus
                            + " sang "
                            + newStatus);
        }

        if (currentStatus == BookingStatus.CANCELLED
                && newStatus != BookingStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Đơn đã hủy không thể phục hồi trạng thái.");
        }

        if (newStatus == BookingStatus.CANCELLED
                && currentStatus != BookingStatus.CANCELLED) {

            restoreRoomInventory(booking);

            String cancelReason = (request.getReason() != null
                    && !request.getReason().isBlank())
                            ? request.getReason().trim()
                            : (SecurityUtils.isAdmin()
                                    ? "Đơn đặt phòng bị hủy bởi quản trị viên"
                                    : "Đơn đặt phòng bị hủy bởi chủ khách sạn");

            String cancelledBy = SecurityUtils.isAdmin()
                    ? "ADMIN"
                    : "OWNER";

            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelReason(cancelReason);
            booking.setCancelledBy(cancelledBy);

            paymentRepository.findByBooking_Id(booking.getId())
                    .ifPresent(payment -> {

                        if (payment.getStatus() == PaymentStatus.PAID) {
                            payment.setStatus(PaymentStatus.REFUNDED);
                        } else {
                            payment.setStatus(PaymentStatus.CANCELLED);
                        }

                        paymentRepository.save(payment);
                    });

            try {
                eventPublisher.publishEvent(
                        new BookingEmailEvent(
                                booking.getId(),
                                "CANCEL",
                                cancelReason));
            } catch (Exception e) {
                log.error(
                        "Lỗi khi gửi email hủy phòng cho booking ID {}: {}",
                        booking.getId(),
                        e.getMessage());
            }
        }

        if (newStatus == BookingStatus.CHECKED_IN
                && currentStatus != BookingStatus.CHECKED_IN) {

            paymentRepository.findByBooking_Id(booking.getId())
                    .ifPresent(payment -> {

                        if (payment.getPaymentMethod() == PaymentMethod.CASH
                                && payment.getStatus() == PaymentStatus.UNPAID) {

                            payment.setStatus(PaymentStatus.PAID);
                            payment.setPaymentDate(LocalDateTime.now());

                            paymentRepository.save(payment);
                        }
                    });
        }

        if (newStatus == BookingStatus.NO_SHOW
                && currentStatus != BookingStatus.NO_SHOW) {

            restoreRoomInventory(booking);

            paymentRepository.findByBooking_Id(booking.getId())
                    .ifPresent(payment -> {

                        if (payment.getStatus() == PaymentStatus.PENDING
                                || payment.getStatus() == PaymentStatus.UNPAID) {

                            payment.setStatus(PaymentStatus.CANCELLED);
                        }

                        paymentRepository.save(payment);
                    });
        }

        booking.setStatus(newStatus);

        Booking savedBooking = bookingRepository.save(booking);

        if (currentStatus != newStatus
                && (newStatus == BookingStatus.COMPLETED
                        || newStatus == BookingStatus.CANCELLED
                        || newStatus == BookingStatus.NO_SHOW)) {

            BigDecimal hotelGrossAmount = BigDecimal.ZERO;
            BigDecimal contractCommission = BigDecimal.ZERO;
            BigDecimal systemSponsorAmount = BigDecimal.ZERO;
            BigDecimal netAmount = BigDecimal.ZERO;

            if (newStatus == BookingStatus.COMPLETED) {

                boolean isSystemPromotion = savedBooking.getPromotion() != null
                        && savedBooking.getPromotion().getHotel() == null;

                contractCommission = Optional.ofNullable(savedBooking.getCommissionAmount())
                        .orElse(BigDecimal.ZERO);

                BigDecimal discountAmount = Optional.ofNullable(savedBooking.getDiscountAmount())
                        .orElse(BigDecimal.ZERO);

                if (isSystemPromotion) {
                    hotelGrossAmount = Optional.ofNullable(savedBooking.getSubtotal())
                            .orElse(BigDecimal.ZERO);
                    systemSponsorAmount = discountAmount;
                } else {
                    hotelGrossAmount = Optional.ofNullable(savedBooking.getTotalAmount())
                            .orElse(BigDecimal.ZERO);
                    systemSponsorAmount = BigDecimal.ZERO;
                }

                netAmount = hotelGrossAmount.subtract(contractCommission);
            }

            hotelStatisticService.recordRealtimeStatistic(
                    savedBooking.getHotel(),
                    hotelGrossAmount,
                    contractCommission,
                    systemSponsorAmount,
                    netAmount,
                    LocalDate.now(),
                    newStatus);
        }

        return enrichBookingResponse(savedBooking);
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

        String searchKeyword = null;
        if (keyword != null && !keyword.trim().isEmpty()) {
            searchKeyword = "%" + keyword.trim().toLowerCase() + "%";
        }

        return bookingRepository
                .searchBookings(
                        searchKeyword,
                        status,
                        hotelId,
                        ownerId,
                        currentOwnerEmail,
                        pageable)
                .map(this::enrichBookingResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyPersonalBookings(
            int page,
            int size) {

        String userEmail = SecurityUtils.getCurrentUserEmail();

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy tài khoản người dùng"));

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        return bookingRepository
                .findByUser_Id(currentUser.getId(), pageable)
                .map(this::enrichBookingResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long bookingId) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy đơn đặt phòng với ID: "
                                + bookingId));

        if (!SecurityUtils.isAdmin()) {

            String currentUserEmail = SecurityUtils.getCurrentUserEmail();

            boolean isOwnerOfThisHotel = booking.getHotel()
                    .getOwner()
                    .getEmail()
                    .equals(currentUserEmail);

            boolean isGuestOfThisBooking = booking.getUser() != null
                    && booking.getUser()
                            .getEmail()
                            .equals(currentUserEmail);

            if (!isOwnerOfThisHotel
                    && !isGuestOfThisBooking) {

                throw new AccessDeniedException(
                        "Bạn không có quyền truy cập đơn đặt phòng này.");
            }
        }

        return enrichBookingResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse lookupBooking(String bookingCode) {

        Booking booking = bookingRepository
                .findByBookingCode(bookingCode)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy đơn"));

        return enrichBookingResponse(booking);
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

    private BookingResponse enrichBookingResponse(Booking booking) {

        BookingResponse response = bookingMapper.toBookingResponse(booking);

        BigDecimal commission = Optional.ofNullable(booking.getCommissionAmount())
                .orElse(BigDecimal.ZERO);

        BigDecimal discount = Optional.ofNullable(booking.getDiscountAmount())
                .orElse(BigDecimal.ZERO);

        boolean isSystemPromotion = booking.getPromotion() != null
                && booking.getPromotion().getHotel() == null;

        BigDecimal hotelGrossAmount = isSystemPromotion
                ? Optional.ofNullable(booking.getSubtotal()).orElse(BigDecimal.ZERO)
                : Optional.ofNullable(booking.getTotalAmount()).orElse(BigDecimal.ZERO);

        BigDecimal hotelNetAmount = hotelGrossAmount.subtract(commission);

        BigDecimal actualCommission = isSystemPromotion ? commission.subtract(discount) : commission;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()))
                ? auth.getName()
                : null;

        boolean isOwnerOfThisHotel = currentUserEmail != null
                && booking.getHotel().getOwner().getEmail().equals(currentUserEmail);

        if (SecurityUtils.isAdmin()) {

            response.setActualCommissionAmount(actualCommission);
            response.setHotelNetAmount(hotelNetAmount);

        } else if (isOwnerOfThisHotel) {

            response.setActualCommissionAmount(actualCommission);
            response.setHotelNetAmount(hotelNetAmount);

        } else {

            response.setCommissionAmount(null);
            response.setActualCommissionAmount(null);
            response.setHotelNetAmount(null);

        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportBookingsToExcel(
            String keyword,
            BookingStatus status,
            Long hotelId,
            Long ownerId) throws IOException {

        boolean isAdmin = SecurityUtils.isAdmin();
        String currentOwnerEmail = null;

        if (SecurityUtils.isHotelOwner() && !isAdmin) {
            currentOwnerEmail = SecurityUtils.getCurrentUserEmail();
        } else if (!isAdmin) {
            throw new AccessDeniedException("Bạn không có quyền export dữ liệu");
        }

        String searchKeyword = null;
        if (keyword != null && !keyword.trim().isEmpty()) {
            searchKeyword = "%" + keyword.trim().toLowerCase() + "%";
        }

        List<BookingExport> bookings = bookingRepository.exportBookings(
                searchKeyword, status, hotelId, ownerId, currentOwnerEmail);

        BigDecimal totalGrossSum = BigDecimal.ZERO;
        BigDecimal totalDiscountSum = BigDecimal.ZERO;
        BigDecimal totalCommissionSum = BigDecimal.ZERO;
        BigDecimal totalNetSum = BigDecimal.ZERO;

        for (BookingExport b : bookings) {
            BigDecimal rawCommission = b.getCommissionAmount() != null ? b.getCommissionAmount() : BigDecimal.ZERO;
            BigDecimal discount = b.getDiscountAmount() != null ? b.getDiscountAmount() : BigDecimal.ZERO;

            boolean isSystemPromotion = b.getPromoId() != null && b.getPromoHotelId() == null;

            BigDecimal hotelGrossAmount = isSystemPromotion
                    ? (b.getSubtotal() != null ? b.getSubtotal() : BigDecimal.ZERO)
                    : (b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO);

            BigDecimal hotelNetAmount = hotelGrossAmount.subtract(rawCommission);

            b.setHotelGrossAmount(hotelGrossAmount);
            b.setHotelNetAmount(hotelNetAmount);

            if (isAdmin) {
                b.setActualCommission(isSystemPromotion ? rawCommission.subtract(discount) : rawCommission);
                totalCommissionSum = totalCommissionSum.add(b.getActualCommission());
            }

            totalGrossSum = totalGrossSum.add(hotelGrossAmount);
            totalDiscountSum = totalDiscountSum.add(discount);
            totalNetSum = totalNetSum.add(hotelNetAmount);
        }

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

        List<String> columns = new java.util.ArrayList<>(java.util.Arrays.asList(
                "Mã đặt phòng", "Tên khách hàng", "Email khách hàng", "SĐT khách hàng",
                "Khách sạn", "Ngày nhận phòng", "Ngày trả phòng", "Trạng thái", "Phương thức thanh toán",
                "Tổng tiền", "Giảm giá", "Nguồn khuyến mãi"));

        if (isAdmin) {
            columns.add("Hoa hồng hệ thống");
        }

        columns.add("Thực thu khách sạn");
        columns.add("Ngày tạo");

        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(20);

        for (int i = 0; i < columns.size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(columns.get(i));
            cell.setCellStyle(headerStyle);
        }

        int rowNum = 1;
        for (BookingExport booking : bookings) {
            Row row = sheet.createRow(rowNum++);
            int colIdx = 0;

            Cell cell0 = row.createCell(colIdx++);
            cell0.setCellValue(booking.getBookingCode());
            cell0.setCellStyle(textStyle);
            Cell cell1 = row.createCell(colIdx++);
            cell1.setCellValue(booking.getGuestName());
            cell1.setCellStyle(textStyle);
            Cell cell2 = row.createCell(colIdx++);
            cell2.setCellValue(booking.getGuestEmail());
            cell2.setCellStyle(textStyle);
            Cell cell3 = row.createCell(colIdx++);
            cell3.setCellValue(booking.getGuestPhone() != null ? booking.getGuestPhone() : "");
            cell3.setCellStyle(centerStyle);
            Cell cell4 = row.createCell(colIdx++);
            cell4.setCellValue(booking.getHotelName());
            cell4.setCellStyle(textStyle);
            Cell cell5 = row.createCell(colIdx++);
            cell5.setCellValue(booking.getCheckInDate() != null ? booking.getCheckInDate().toString() : "");
            cell5.setCellStyle(centerStyle);
            Cell cell6 = row.createCell(colIdx++);
            cell6.setCellValue(booking.getCheckOutDate() != null ? booking.getCheckOutDate().toString() : "");
            cell6.setCellStyle(centerStyle);
            Cell cell7 = row.createCell(colIdx++);
            cell7.setCellValue(booking.getStatus() != null ? booking.getStatus().name() : "");
            cell7.setCellStyle(centerStyle);
            Cell cell8 = row.createCell(colIdx++);
            cell8.setCellValue(booking.getPaymentMethod() != null ? booking.getPaymentMethod().name() : "N/A");
            cell8.setCellStyle(centerStyle);

            Cell cell9 = row.createCell(colIdx++);
            cell9.setCellValue(booking.getHotelGrossAmount().doubleValue());
            cell9.setCellStyle(moneyStyle);
            Cell cell10 = row.createCell(colIdx++);
            cell10.setCellValue(booking.getDiscountAmount() != null ? booking.getDiscountAmount().doubleValue() : 0);
            cell10.setCellStyle(moneyStyle);

            Cell cellPromoSource = row.createCell(colIdx++);
            String promoSource = "Không có";
            if (booking.getPromoId() != null) {
                promoSource = booking.getPromoHotelId() == null ? "Hệ thống" : "Khách sạn";
            }
            cellPromoSource.setCellValue(promoSource);
            cellPromoSource.setCellStyle(centerStyle);

            if (isAdmin) {
                Cell cellComm = row.createCell(colIdx++);
                cellComm.setCellValue(booking.getActualCommission().doubleValue());
                cellComm.setCellStyle(moneyStyle);
            }

            Cell cellNet = row.createCell(colIdx++);
            cellNet.setCellValue(booking.getHotelNetAmount().doubleValue());
            cellNet.setCellStyle(moneyStyle);

            Cell cellDate = row.createCell(colIdx++);
            if (booking.getCreatedAt() != null) {
                cellDate.setCellValue(java.sql.Timestamp.valueOf(booking.getCreatedAt()));
            }
            cellDate.setCellStyle(dateStyle);
        }

        Row totalRow = sheet.createRow(rowNum);
        totalRow.setHeightInPoints(20);

        int financeStartCol = 9;
        for (int i = 0; i < financeStartCol; i++) {
            Cell cell = totalRow.createCell(i);
            cell.setCellStyle(totalLabelStyle);
            if (i == 0)
                cell.setCellValue("Tổng:");
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum, rowNum, 0, financeStartCol - 1));

        int tColIdx = financeStartCol;
        Cell tGross = totalRow.createCell(tColIdx++);
        tGross.setCellValue(totalGrossSum.doubleValue());
        tGross.setCellStyle(totalMoneyStyle);
        Cell tDisc = totalRow.createCell(tColIdx++);
        tDisc.setCellValue(totalDiscountSum.doubleValue());
        tDisc.setCellStyle(totalMoneyStyle);

        Cell tEmptyPromo = totalRow.createCell(tColIdx++);
        tEmptyPromo.setCellStyle(totalLabelStyle);

        if (isAdmin) {
            Cell tComm = totalRow.createCell(tColIdx++);
            tComm.setCellValue(totalCommissionSum.doubleValue());
            tComm.setCellStyle(totalMoneyStyle);
        }

        Cell tNet = totalRow.createCell(tColIdx++);
        tNet.setCellValue(totalNetSum.doubleValue());
        tNet.setCellStyle(totalMoneyStyle);

        Cell tEmptyDate = totalRow.createCell(tColIdx);
        tEmptyDate.setCellStyle(totalLabelStyle);

        for (int i = 0; i < columns.size(); i++) {
            sheet.autoSizeColumn(i);
            sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1000);
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