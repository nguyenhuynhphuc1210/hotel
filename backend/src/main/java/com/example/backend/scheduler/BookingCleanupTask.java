package com.example.backend.scheduler;

import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.service.HotelStatisticService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingCleanupTask {

    private final BookingRepository bookingRepository;
    private final RoomCalendarRepository roomCalendarRepository;
    private final HotelStatisticService hotelStatisticService;

    // Chạy mỗi 5 phút một lần
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void cleanupExpiredBookings() {
        LocalDateTime timeoutLimit = LocalDateTime.now().minusMinutes(15);

        List<Booking> expiredBookings = bookingRepository
                .findByStatusAndCreatedAtBefore(BookingStatus.PENDING, timeoutLimit);

        if (expiredBookings.isEmpty()) {
            return;
        }

        for (Booking booking : expiredBookings) {
            log.info("Hệ thống đang tự động hủy đơn hàng hết hạn thanh toán: {}", booking.getBookingCode());

            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(LocalDateTime.now());
            booking.setCancelledBy("SYSTEM");
            booking.setCancelReason("Hết hạn thời gian thanh toán (15 phút)");

            if (booking.getPayment() != null) {
                booking.getPayment().setStatus(PaymentStatus.CANCELLED);
            }

            for (BookingRoom br : booking.getBookingRooms()) {
                List<RoomCalendar> calendars = roomCalendarRepository.findByRoomType_IdAndDateBetween(
                        br.getRoomType().getId(),
                        booking.getCheckInDate(),
                        booking.getCheckOutDate().minusDays(1));
                
                for (RoomCalendar calendar : calendars) {
                    int newBookedRooms = calendar.getBookedRooms() - br.getQuantity();
                    calendar.setBookedRooms(Math.max(0, newBookedRooms));
                }
                roomCalendarRepository.saveAll(calendars);
            }

            Booking savedBooking = bookingRepository.save(booking);

            hotelStatisticService.recordRealtimeStatistic(
                    savedBooking.getHotel(),
                    savedBooking.getTotalAmount(),
                    LocalDate.now(),
                    BookingStatus.CANCELLED);
        }
        
        log.info("Đã hoàn tất dọn dẹp {} đơn hàng quá hạn.", expiredBookings.size());
    }
}