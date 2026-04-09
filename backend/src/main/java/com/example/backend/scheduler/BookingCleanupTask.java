package com.example.backend.scheduler;

import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.PaymentStatus;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.RoomCalendarRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;


@Component
@RequiredArgsConstructor
@Slf4j
public class BookingCleanupTask {

    private final BookingRepository bookingRepository;
    private final RoomCalendarRepository roomCalendarRepository;

    // Chạy mỗi 5 phút một lần
    @Scheduled(fixedRate = 300000) 
    @Transactional
    public void cleanupExpiredBookings() {
        LocalDateTime timeoutLimit = LocalDateTime.now().minusMinutes(15);

        List<Booking> expiredBookings = bookingRepository
            .findByStatusAndCreatedAtBefore(BookingStatus.PENDING, timeoutLimit);

        for (Booking booking : expiredBookings) {
            log.info("Đang hủy đơn hàng quá hạn: " + booking.getBookingCode());

            booking.setStatus(BookingStatus.CANCELLED);
            if (booking.getPayment() != null) {
                booking.getPayment().setStatus(PaymentStatus.CANCELLED);
            }

            for (BookingRoom br : booking.getBookingRooms()) {
                List<RoomCalendar> calendars = roomCalendarRepository.findByRoomType_IdAndDateBetween(
                        br.getRoomType().getId(),
                        booking.getCheckInDate(),
                        booking.getCheckOutDate().minusDays(1)
                );
                for (RoomCalendar calendar : calendars) {
                    calendar.setBookedRooms(Math.max(0, calendar.getBookedRooms() - br.getQuantity()));
                }
                roomCalendarRepository.saveAll(calendars);
            }
            bookingRepository.save(booking);
        }
    }
}
