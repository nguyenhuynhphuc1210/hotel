package com.example.backend.service.impl;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.request.BookingRoomRequest;
import com.example.backend.dto.request.UpdateBookingStatusRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.*;
import com.example.backend.enums.BookingStatus;
import com.example.backend.mapper.BookingMapper;
import com.example.backend.repository.*;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        // 1. Kiểm tra ngày tháng
        if (!request.getCheckInDate().isBefore(request.getCheckOutDate())) {
            throw new IllegalArgumentException("Ngày check-out phải sau ngày check-in ít nhất 1 đêm");
        }

        // 2. Lấy thông tin User (Cho phép null nếu là khách vãng lai)
        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        }

        // 3. Lấy thông tin Khách sạn
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách sạn"));

        // 4. Khởi tạo Booking Entity
        Booking booking = bookingMapper.toBooking(request, user, hotel, null, new ArrayList<>());
        BigDecimal grandTotal = BigDecimal.ZERO;

        // 5. Xử lý từng loại phòng khách đặt
        long expectedNights = request.getCheckOutDate().toEpochDay() - request.getCheckInDate().toEpochDay();

        for (BookingRoomRequest roomReq : request.getBookingRooms()) {
            RoomType roomType = roomTypeRepository.findById(roomReq.getRoomTypeId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy loại phòng"));

            // SỬ DỤNG PESSIMISTIC LOCK: Khóa các ngày lịch này lại để chống Overbooking
            List<RoomCalendar> calendars = roomCalendarRepository.findAndLockByRoomType_IdAndDateBetween(
                    roomType.getId(),
                    request.getCheckInDate(),
                    request.getCheckOutDate().minusDays(1));

            if (calendars.size() != expectedNights) {
                throw new RuntimeException("Hệ thống chưa có đủ lịch giá cho khoảng thời gian này");
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
                    throw new RuntimeException("Loại phòng " + roomType.getTypeName() + " đã hết phòng trống vào ngày "
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
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy mã giảm giá"));

            LocalDate today = LocalDate.now();
            if (!promo.getIsActive() || today.isBefore(promo.getStartDate().toLocalDate())
                    || today.isAfter(promo.getEndDate().toLocalDate())) {
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
        return bookingMapper.toBookingResponse(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt phòng"));

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

        return bookingMapper.toBookingResponse(bookingRepository.save(booking));
    }

    @Override
    @Transactional
    public BookingResponse updateBookingStatus(Long bookingId, UpdateBookingStatusRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt phòng"));

        SecurityUtils.checkOwnerOrAdmin(booking.getHotel().getOwner().getEmail());

        BookingStatus newStatus = request.getStatus();

        if (booking.getStatus() == BookingStatus.CANCELLED && newStatus != BookingStatus.CANCELLED) {
            throw new IllegalStateException("Đơn đã hủy không thể phục hồi trạng thái.");
        }

        if (newStatus == BookingStatus.CANCELLED && booking.getStatus() != BookingStatus.CANCELLED) {
            restoreRoomInventory(booking);
        }

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
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản người dùng"));

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt phòng với ID: " + bookingId));

        if (SecurityUtils.isAdmin()) {
            // Admin: Được xem thoải mái tất cả các đơn

        } else if (SecurityUtils.isHotelOwner()) {
            // Owner: Chỉ được xem đơn của khách sạn do mình quản lý
            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            if (!booking.getHotel().getOwner().getEmail().equals(ownerEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Bạn không có quyền xem đơn đặt phòng của khách sạn khác.");
            }

        } else {
            // User (Khách hàng đăng nhập): Chỉ được xem đơn của chính mình
            String userEmail = SecurityUtils.getCurrentUserEmail();

            // Nếu đơn này là của khách vãng lai (user == null) HOẶC user không khớp email
            // -> Cấm xem
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn đặt phòng với mã và email này"));
        return bookingMapper.toBookingResponse(booking);
    }

    private void restoreRoomInventory(Booking booking) {
        for (BookingRoom br : booking.getBookingRooms()) {
            for (BookingRoomRate rate : br.getRates()) {
                RoomCalendar calendar = roomCalendarRepository.findByRoomType_IdAndDate(
                        br.getRoomType().getId(), rate.getDate())
                        .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy lịch phòng"));

                int newBookedRooms = calendar.getBookedRooms() - br.getQuantity();
                calendar.setBookedRooms(Math.max(newBookedRooms, 0));
                roomCalendarRepository.save(calendar);
            }
        }
    }
}