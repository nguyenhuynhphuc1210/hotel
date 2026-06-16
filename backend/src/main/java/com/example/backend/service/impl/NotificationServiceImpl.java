package com.example.backend.service.impl;

import com.example.backend.dto.response.NotificationResponse;
import com.example.backend.entity.Notification;
import com.example.backend.entity.User;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public NotificationResponse createNotification(Long userId, String title, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + userId));
        return createNotification(user.getEmail(), title, message);
    }

    @Override
    @Transactional
    public NotificationResponse createNotification(String email, String title, String message) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            log.warn("Không thể tạo thông báo. Không tìm thấy người dùng với email: {}", email);
            return null;
        }

        User user = userOptional.get();

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        Notification saved = notificationRepository.save(notification);

        NotificationResponse response = toResponse(saved);
        try {
            messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/notifications", response);
        } catch (Exception ex) {
            log.error("Không gửi được notification qua WebSocket cho {}: {}", user.getEmail(), ex.getMessage());
        }
        return response;
    }

    @Override
    public Page<NotificationResponse> getNotificationsForCurrentUser(int page, int size) {
        String currentEmail = SecurityUtils.getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng hiện tại"));

        return notificationRepository.findByUserOrderByCreatedAtDesc(user, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    @Override
    public long getUnreadCountForCurrentUser() {
        String currentEmail = SecurityUtils.getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng hiện tại"));
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    @Override
    @Transactional
    public long markAllAsReadForCurrentUser() {
        String currentEmail = SecurityUtils.getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng hiện tại"));

        var unreadNotifications = notificationRepository.findByUserAndIsReadFalse(user);
        unreadNotifications.forEach(notification -> notification.setIsRead(true));
        notificationRepository.saveAll(unreadNotifications);
        return unreadNotifications.size();
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long notificationId) {
        String currentEmail = SecurityUtils.getCurrentUserEmail();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo"));

        if (!notification.getUser().getEmail().equals(currentEmail)) {
            throw new IllegalArgumentException("Bạn không có quyền cập nhật thông báo này");
        }

        notification.setIsRead(true);
        Notification saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
