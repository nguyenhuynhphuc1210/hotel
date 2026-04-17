package com.example.backend.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class BookingEmailEvent {
    private final Long bookingId;

    private final String type; 

    private final String reason; 
}