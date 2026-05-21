package com.example.backend.listener;

import com.example.backend.event.NotificationEvent;
import com.example.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotificationEvent(NotificationEvent event) {
        log.info("Gửi notification cho owner: {}", event.getOwnerEmail());
        try {
            notificationService.createNotification(event.getOwnerEmail(), event.getTitle(), event.getMessage());
        } catch (Exception ex) {
            log.error("Không thể tạo notification: {}", ex.getMessage());
        }
    }
}
