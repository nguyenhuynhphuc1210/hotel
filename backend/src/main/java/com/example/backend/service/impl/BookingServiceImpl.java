package com.example.backend.service.impl;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.request.BookingRoomRequest;
import com.example.backend.dto.request.UpdateBookingStatusRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.*;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentMethod;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.mapper.BookingMapper;
import com.example.backend.repository.*;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.BookingService;
import com.example.backend.service.HotelStatisticService;
import com.example.backend.service.MomoService;
import com.example.backend.service.VNPayService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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

        if (request.getPaymentMethod() == PaymentMethod.VNPAY) {
            String paymentUrl = vnPayService.createPaymentUrl(savedBooking, requestServlet);
            response.setPaymentUrl(paymentUrl);
        } else if (request.getPaymentMethod() == PaymentMethod.MOMO) {
            String paymentUrl = momoService.createPaymentUrl(savedBooking);
            response.setPaymentUrl(paymentUrl);
        }

        return response;
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));

        if (!SecurityUtils.isAdmin()) {
            String currentUserEmail = SecurityUtils.getCurrentUserEmail();

            boolean isOwnerOfThisHotel = booking.getHotel().getOwner().getEmail().equals(currentUserEmail);
            boolean isGuestOfThisBooking = booking.getUser() != null
                    && booking.getUser().getEmail().equals(currentUserEmail);

            if (!isOwnerOfThisHotel && !isGuestOfThisBooking) {
                throw new AccessDeniedException("Bạn không có quyền hủy đơn đặt phòng này.");
            }
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalArgumentException("Không thể hủy đơn đặt phòng ở trạng thái hiện tại");
        }

        restoreRoomInventory(booking);

        booking.setStatus(BookingStatus.CANCELLED);
        Booking savedBooking = bookingRepository.save(booking);

        hotelStatisticService.recordRealtimeStatistic(
                savedBooking.getHotel(),
                savedBooking.getTotalAmount(),
                LocalDate.now(),
                BookingStatus.CANCELLED);

        paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.PAID) {
                payment.setStatus(PaymentStatus.REFUNDED);
            } else if (payment.getStatus() == PaymentStatus.UNPAID || payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.CANCELLED);
            }
            paymentRepository.save(payment);
        });

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
            paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
                if (payment.getStatus() == PaymentStatus.PAID) {
                    payment.setStatus(PaymentStatus.REFUNDED);
                } else {
                    payment.setStatus(PaymentStatus.CANCELLED);
                }
                paymentRepository.save(payment);
            });
        }

        if (newStatus == BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.CHECKED_IN) {
            paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {

                if (payment.getPaymentMethod() == PaymentMethod.CASH && payment.getStatus() == PaymentStatus.UNPAID) {
                    payment.setStatus(PaymentStatus.PAID);
                    payment.setPaymentDate(LocalDateTime.now());
                    paymentRepository.save(payment);
                }
            });
        }

        if (newStatus == BookingStatus.NO_SHOW && booking.getStatus() != BookingStatus.NO_SHOW) {
            restoreRoomInventory(booking);
            paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
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
    public List<BookingResponse> getBookingsForOwner() {

        if (!SecurityUtils.isHotelOwner() && !SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Chỉ chủ khách sạn hoặc Admin mới được xem danh sách này");
        }

        List<Booking> bookings;

        if (SecurityUtils.isAdmin()) {

            bookings = bookingRepository.findAllByOrderByCreatedAtDesc();
        } else {
            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            bookings = bookingRepository.findByHotelOwnerEmailOrderByCreatedAtDesc(ownerEmail);
        }

        return bookings.stream()
                .map(bookingMapper::toBookingResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getMyPersonalBookings() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng"));

        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());

        return bookings.stream()
                .map(bookingMapper::toBookingResponse)
                .collect(Collectors.toList());
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
    public BookingResponse lookupGuestBooking(String bookingCode, String email) {
        Booking booking = bookingRepository.findByBookingCodeAndGuestEmail(bookingCode, email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng với mã và email này"));
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
}