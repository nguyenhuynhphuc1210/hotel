package com.example.backend.listener;

import com.example.backend.event.BookingEmailEvent;
import com.example.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingEventListener {

    private final EmailService emailService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBookingEmailEvent(BookingEmailEvent event) {
        log.info("Transaction đã commit xong. Bắt đầu gọi Async EmailService cho Booking ID: {}", event.getBookingId());

        try {
            if ("CONFIRM".equals(event.getType())) {

                emailService.sendBookingConfirmationEmail(event.getBookingId());
            } else if ("CANCEL".equals(event.getType())) {
                emailService.sendBookingCancellationEmail(event.getBookingId(), event.getReason());
            }
        } catch (Exception e) {
            log.error("Có lỗi xảy ra trong quá trình kích hoạt gửi email ngầm: {}", e.getMessage());
        }
    }
}