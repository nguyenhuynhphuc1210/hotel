package com.example.backend.service;

import com.example.backend.dto.response.NotificationResponse;
import org.springframework.data.domain.Page;

public interface NotificationService {
    NotificationResponse createNotification(Long userId, String title, String message);
    NotificationResponse createNotification(String ownerEmail, String title, String message);
    Page<NotificationResponse> getNotificationsForCurrentUser(int page, int size);
    long getUnreadCountForCurrentUser();
    NotificationResponse markAsRead(Long notificationId);
    long markAllAsReadForCurrentUser();
}
