package com.example.backend.service.impl;

import com.example.backend.dto.request.ForgotPasswordRequest;
import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.request.ResetPasswordRequest;
import com.example.backend.dto.request.VerifyOtpRequest;
import com.example.backend.dto.response.AuthResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.OtpToken;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.mapper.UserMapper;
import com.example.backend.repository.OtpTokenRepository;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenProvider;
import com.example.backend.service.AuthService;
import com.example.backend.service.EmailService;

import lombok.RequiredArgsConstructor;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;

    @Override
    public AuthResponse login(LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        String token = jwtTokenProvider.generateToken(authentication);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng"));

        return AuthResponse.builder()
                .token(token)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng!");
        }

        Role role = roleRepository.findByRoleName("ROLE_USER")
                .orElseThrow(() -> new EntityNotFoundException("Lỗi hệ thống: Không tìm thấy quyền USER!"));

        User user = userMapper.toUser(request, role);

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);

        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional
    public void verifyOtp(VerifyOtpRequest request) {
        getValidOtpToken(request.getEmail(), request.getOtp());
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        OtpToken otpToken = getValidOtpToken(request.getEmail(), request.getOtp());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        otpTokenRepository.delete(otpToken);
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với email này"));

        otpTokenRepository.deleteByEmail(user.getEmail());

        SecureRandom random = new SecureRandom();

        String rawOtp = String.format("%06d", random.nextInt(1000000)); 

        String hashedOtp = passwordEncoder.encode(rawOtp);

        OtpToken otpToken = OtpToken.builder()
                .email(user.getEmail())
                .otp(hashedOtp)
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .build();
        otpTokenRepository.save(otpToken);

        emailService.sendOtpEmail(user.getEmail(), rawOtp); 
    }

    private OtpToken getValidOtpToken(String email, String rawOtp) {
        OtpToken otpToken = otpTokenRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Không có yêu cầu cấp lại mật khẩu nào đang hoạt động"));

        if (!passwordEncoder.matches(rawOtp, otpToken.getOtp())) {
            throw new IllegalArgumentException("Mã OTP không chính xác");
        }

        if (otpToken.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpTokenRepository.delete(otpToken);
            throw new IllegalArgumentException("Mã OTP đã hết hạn");
        }

        return otpToken;
    }
}