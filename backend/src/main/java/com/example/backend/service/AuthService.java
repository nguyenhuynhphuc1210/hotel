package com.example.backend.service;

import com.example.backend.dto.request.ForgotPasswordRequest;
import com.example.backend.dto.request.ResetPasswordRequest;
import com.example.backend.dto.request.VerifyOtpRequest;
import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.PartnerRegisterRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.response.AuthResponse;
import com.example.backend.dto.response.UserResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    UserResponse register(RegisterRequest request);

    AuthResponse registerPartner(PartnerRegisterRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void verifyOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);
}