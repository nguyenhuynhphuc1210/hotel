package com.example.backend.service;


public interface EmailService {
    void sendOtpEmail(String to, String otp);

    void sendBookingConfirmationEmail(Long bookingId);

    void sendBookingCancellationEmail(Long bookingId, String reason);
}
