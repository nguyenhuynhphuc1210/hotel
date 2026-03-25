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

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        // 1. Kiểm tra ngày tháng
        if (!request.getCheckInDate().isBefore(request.getCheckOutDate())) {
            throw new IllegalArgumentException("Ngày check-out phải sau ngày check-in ít nhất 1 đêm");
        }

        // 2. Lấy thông tin User (Cho phép null nếu là khách vãng lai)
        User user = null;

        // Lấy Authentication trực tiếp để tránh bị ném lỗi 401 từ SecurityUtils nếu là
        // khách vãng lai
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            String currentUserEmail = auth.getName(); // Lấy email từ Token

            user = userRepository.findByEmail(currentUserEmail)
                    .orElseThrow(() -> new EntityNotFoundException("Tài khoản không tồn tại hoặc đã bị khóa"));
        }

        if (user == null) {
            if (request.getGuestEmail() == null || request.getGuestEmail().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khách vãng lai bắt buộc phải nhập Email");
            }
            if (request.getGuestName() == null || request.getGuestName().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khách vãng lai bắt buộc phải nhập Tên");
            }
        }

        // 3. Lấy thông tin Khách sạn
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        // 4. Khởi tạo Booking Entity
        Booking booking = bookingMapper.toBooking(request, user, hotel, null, new ArrayList<>());
        BigDecimal grandTotal = BigDecimal.ZERO;

        // 5. Xử lý từng loại phòng khách đặt
        long expectedNights = request.getCheckOutDate().toEpochDay() - request.getCheckInDate().toEpochDay();

        for (BookingRoomRequest roomReq : request.getBookingRooms()) {
            RoomType roomType = roomTypeRepository.findById(roomReq.getRoomTypeId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng"));

            // SỬ DỤNG PESSIMISTIC LOCK: Khóa các ngày lịch này lại để chống Overbooking
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
                // Kiểm tra phòng trống
                if (!calendar.getIsAvailable()
                        || (calendar.getTotalRooms() - calendar.getBookedRooms() < roomReq.getQuantity())) {
                    throw new IllegalArgumentException("Loại phòng " + roomType.getTypeName() + " đã hết phòng trống vào ngày "
                            + calendar.getDate());
                }

                // Trừ phòng (Giữ chỗ)
                calendar.setBookedRooms(calendar.getBookedRooms() + roomReq.getQuantity());

                // Tính tiền đêm đó
                BigDecimal nightlyCost = calendar.getPrice().multiply(BigDecimal.valueOf(roomReq.getQuantity()));
                roomTotalCost = roomTotalCost.add(nightlyCost);

                // Lưu lịch sử giá
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

        // 6. Xử lý Mã giảm giá (Promotion)
        BigDecimal discount = BigDecimal.ZERO;
        if (request.getPromotionId() != null) {
            Promotion promo = promotionRepository.findById(request.getPromotionId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy mã giảm giá"));

            LocalDateTime now = LocalDateTime.now();
            if (!promo.getIsActive() || now.isBefore(promo.getStartDate())
                    || now.isAfter(promo.getEndDate())) {
                throw new IllegalArgumentException("Mã giảm giá đã hết hạn hoặc không hợp lệ");
            }

            if (promo.getHotel() != null && !promo.getHotel().getId().equals(hotel.getId())) {
                throw new IllegalArgumentException("Mã giảm giá này không áp dụng cho khách sạn này");
            }

            BigDecimal calculatedDiscount = grandTotal
                    .multiply(promo.getDiscountPercent().divide(BigDecimal.valueOf(100)));
            if (promo.getMaxDiscountAmount() != null
                    && calculatedDiscount.compareTo(promo.getMaxDiscountAmount()) > 0) {
                discount = promo.getMaxDiscountAmount();
            } else {
                discount = calculatedDiscount;
            }

            booking.setPromotion(promo);
        }

        booking.setDiscountAmount(discount);
        booking.setTotalAmount(grandTotal.subtract(discount));

        // 7. Lưu và trả kết quả
        Booking savedBooking = bookingRepository.save(booking);
        Payment payment = Payment.builder()
                .booking(savedBooking)
                .paymentMethod(request.getPaymentMethod())
                .amount(savedBooking.getTotalAmount())
                .status(PaymentStatus.PENDING)

                .build();

        paymentRepository.save(payment);

        // 9. Map sang Response và xử lý URL thanh toán
        BookingResponse response = bookingMapper.toBookingResponse(savedBooking);

        // Kiểm tra phương thức thanh toán
        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            // Thanh toán tiền mặt tại khách sạn thì không cần link thanh toán online
            response.setPaymentUrl(null);
        }
        // Sau này bạn có thể thêm logic "else if (VNPAY)" ở đây

        return response;
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));

        if (SecurityUtils.isAdmin()) {

        } else if (SecurityUtils.isHotelOwner()) {
            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            if (!booking.getHotel().getOwner().getEmail().equals(ownerEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Bạn không có quyền hủy đơn của khách sạn khác.");
            }
        } else {
            String userEmail = SecurityUtils.getCurrentUserEmail();
            if (booking.getUser() == null || !booking.getUser().getEmail().equals(userEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền hủy đơn đặt phòng này.");
            }
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalStateException("Không thể hủy đơn đặt phòng ở trạng thái hiện tại");
        }

        restoreRoomInventory(booking);

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {

            if (payment.getPaymentMethod() == PaymentMethod.CASH
                    && payment.getStatus() == PaymentStatus.PENDING) {

                payment.setStatus(PaymentStatus.CANCELLED);
                paymentRepository.save(payment);
            }
        });

        return bookingMapper.toBookingResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse updateBookingStatus(Long bookingId, UpdateBookingStatusRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));

        SecurityUtils.checkOwnerOrAdmin(booking.getHotel().getOwner().getEmail());

        BookingStatus newStatus = request.getStatus();

        // 1. Chặn phục hồi đơn đã hủy
        if (booking.getStatus() == BookingStatus.CANCELLED && newStatus != BookingStatus.CANCELLED) {
            throw new IllegalStateException("Đơn đã hủy không thể phục hồi trạng thái.");
        }

        // 2. Xử lý khi HỦY đơn (CANCELLED)
        if (newStatus == BookingStatus.CANCELLED && booking.getStatus() != BookingStatus.CANCELLED) {
            restoreRoomInventory(booking); // Hoàn trả tồn kho phòng

            // Hủy thanh toán tiền mặt đang chờ
            paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
                if (payment.getPaymentMethod() == PaymentMethod.CASH
                        && payment.getStatus() == PaymentStatus.PENDING) {

                    payment.setStatus(PaymentStatus.CANCELLED);
                    paymentRepository.save(payment);
                }
            });
        }

        // 3. Xử lý khi HOÀN TẤT đơn (COMPLETED)
        if (newStatus == BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.COMPLETED) {

            // Nếu là tiền mặt và chưa thanh toán -> Đánh dấu là đã thu tiền (SUCCESS)
            paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
                if (payment.getPaymentMethod() == PaymentMethod.CASH
                        && payment.getStatus() == PaymentStatus.PENDING) {

                    payment.setStatus(PaymentStatus.SUCCESS);
                    payment.setPaymentDate(LocalDateTime.now());
                    paymentRepository.save(payment);
                }
            });
        }

        // 4. Lưu thay đổi
        booking.setStatus(newStatus);
        return bookingMapper.toBookingResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings() {
        List<Booking> bookings;

        if (SecurityUtils.isAdmin()) {

            bookings = bookingRepository.findAllByOrderByCreatedAtDesc();
        } else if (SecurityUtils.isHotelOwner()) {

            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            bookings = bookingRepository.findByHotelOwnerEmailOrderByCreatedAtDesc(ownerEmail);
        } else {

            String userEmail = SecurityUtils.getCurrentUserEmail();
            User currentUser = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng"));

            bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        }

        return bookings.stream()
                .map(bookingMapper::toBookingResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng với ID: " + bookingId));

        if (SecurityUtils.isAdmin()) {

        } else if (SecurityUtils.isHotelOwner()) {

            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            if (!booking.getHotel().getOwner().getEmail().equals(ownerEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Bạn không có quyền xem đơn đặt phòng của khách sạn khác.");
            }

        } else {

            String userEmail = SecurityUtils.getCurrentUserEmail();

            if (booking.getUser() == null || !booking.getUser().getEmail().equals(userEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem đơn đặt phòng này.");
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
}