package com.example.backend.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NotificationEvent {
    private final String ownerEmail;
    private final String title;
    private final String message;
}
