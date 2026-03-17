package com.example.backend.service.impl;

import com.example.backend.dto.request.BookingRequest;
import com.example.backend.dto.request.BookingRoomRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Promotion;
import com.example.backend.entity.RoomType;
import com.example.backend.entity.User;
import com.example.backend.mapper.BookingMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.PromotionRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final PromotionRepository promotionRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final BookingMapper bookingMapper;

    @Override
    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream().map(bookingMapper::toBookingResponse).collect(Collectors.toList());
    }

    @Override
    public BookingResponse getBookingById(Long id) {
        return bookingRepository.findById(id)
                .map(bookingMapper::toBookingResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found id=" + id));
    }

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        // 1. Tìm các thực thể liên quan
        User user = (request.getUserId() != null) ? userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found")) : null;

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found"));

        Promotion promotion = (request.getPromotionId() != null)
                ? promotionRepository.findById(request.getPromotionId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Promotion not found"))
                : null;

        // 2. Tính số đêm ở
        long nights = java.time.temporal.ChronoUnit.DAYS.between(request.getCheckInDate(), request.getCheckOutDate());
        if (nights <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày trả phòng phải sau ngày nhận phòng");

        // 3. Xử lý danh sách phòng và tính Subtotal
        BigDecimal subtotal = BigDecimal.ZERO;
        List<BookingRoom> rooms = new ArrayList<>();

        for (BookingRoomRequest r : request.getBookingRooms()) {
            RoomType roomType = roomTypeRepository.findById(r.getRoomTypeId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "RoomType not found"));

            // Lấy giá từ DB
            BigDecimal pricePerNight = roomType.getBasePrice();
            BigDecimal roomTotal = pricePerNight.multiply(BigDecimal.valueOf(r.getQuantity()))
                    .multiply(BigDecimal.valueOf(nights));
            subtotal = subtotal.add(roomTotal);

            BookingRoom br = BookingRoom.builder()
                    .roomType(roomType)
                    .quantity(r.getQuantity())
                    .pricePerNight(pricePerNight)
                    .build();
            rooms.add(br);
        }

        // 4. Tính toán giảm giá (Promotion Logic)
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (promotion != null && promotion.getIsActive()) { // Giả sử entity Promotion có trường isActive
            if (subtotal.compareTo(promotion.getMinOrderValue()) >= 0) {
                BigDecimal percentFactor = promotion.getDiscountPercent().divide(new BigDecimal("100"));
                discountAmount = subtotal.multiply(percentFactor);

                if (promotion.getMaxDiscountAmount() != null &&
                        discountAmount.compareTo(promotion.getMaxDiscountAmount()) > 0) {
                    discountAmount = promotion.getMaxDiscountAmount();
                }
            }
        }

        if (discountAmount.compareTo(subtotal) > 0)
            discountAmount = subtotal;
        BigDecimal totalAmount = subtotal.subtract(discountAmount);

        // 5. Khởi tạo Entity Booking và xử lý thông tin Khách hàng (Lazy Validation)
        Booking booking = bookingMapper.toBooking(request, user, hotel, promotion, rooms);

        if (user != null) {
            booking.setUser(user);
            // Ưu tiên lấy từ request để khách có thể đặt hộ người khác,
            // nhưng nếu request trống thì lấy từ profile user.
            booking.setGuestEmail(request.getGuestEmail() != null ? request.getGuestEmail() : user.getEmail());
            booking.setGuestName(request.getGuestName() != null ? request.getGuestName() : user.getFullName());
            booking.setGuestPhone(request.getGuestPhone() != null ? request.getGuestPhone() : user.getPhone());

            // LOGIC CẬP NHẬT PHONE CHO USER (Lazy Validation)
            if (user.getPhone() == null && request.getGuestPhone() != null) {
                user.setPhone(request.getGuestPhone());
                userRepository.save(user); // Lưu lại vào profile để lần sau không cần nhập
            }
        } else {
            // Khách vãng lai
            booking.setGuestEmail(request.getGuestEmail());
            booking.setGuestName(request.getGuestName());
            booking.setGuestPhone(request.getGuestPhone());
        }

        booking.setSubtotal(subtotal);
        booking.setDiscountAmount(discountAmount);
        booking.setTotalAmount(totalAmount);

        // Thiết lập quan hệ 2 chiều
        rooms.forEach(br -> br.setBooking(booking));
        booking.setBookingRooms(rooms);

        return bookingMapper.toBookingResponse(bookingRepository.save(booking));
    }


    @Override
    public void deleteBooking(Long id) {
        Booking existing = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found id=" + id));
        bookingRepository.delete(existing);
    }
}
