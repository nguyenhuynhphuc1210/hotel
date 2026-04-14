package com.example.backend.service;

import com.example.backend.entity.Booking;

public interface EmailService {
    void sendOtpEmail(String to, String otp);

    void sendBookingConfirmationEmail(Booking booking);

    void sendBookingCancellationEmail(Booking booking);
}
