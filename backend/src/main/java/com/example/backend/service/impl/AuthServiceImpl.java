package com.example.backend.service.impl;

import com.example.backend.dto.request.ForgotPasswordRequest;
import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.PartnerRegisterRequest;
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
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

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
import org.springframework.beans.factory.annotation.Value;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.JsonFactory;
import java.util.Collections;
import java.util.UUID;

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

    @Value("${google.client.id}")
    private String googleClientId;

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
    public AuthResponse registerPartner(PartnerRegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email này đã được sử dụng!");
        }

        Role ownerRole = roleRepository.findByRoleName("ROLE_HOTEL_OWNER")
                .orElseThrow(() -> new RuntimeException("Lỗi cấu hình: Không tìm thấy quyền Đối tác"));

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(ownerRole)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        String newToken = jwtTokenProvider.generateTokenFromEmail(savedUser.getEmail());

        return new AuthResponse(newToken, userMapper.toUserResponse(savedUser));
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
                .orElseThrow(
                        () -> new IllegalArgumentException("Không có yêu cầu cấp lại mật khẩu nào đang hoạt động"));

        if (!passwordEncoder.matches(rawOtp, otpToken.getOtp())) {
            throw new IllegalArgumentException("Mã OTP không chính xác");
        }

        if (otpToken.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpTokenRepository.delete(otpToken);
            throw new IllegalArgumentException("Mã OTP đã hết hạn");
        }

        return otpToken;
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(String idTokenString) {

        GoogleIdToken verifier = verifyGoogleToken(idTokenString);
        GoogleIdToken.Payload payload = verifier.getPayload();

        String email = payload.getEmail();
        String avatarUrl = (String) payload.get("picture");

        String familyName = (String) payload.get("family_name");
        String givenName = (String) payload.get("given_name");

        String fullName;
        if (familyName != null && givenName != null) {
            fullName = familyName + " " + givenName;
        } else {
            fullName = (String) payload.get("name");
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {

            Role userRole = roleRepository.findByRoleName("ROLE_USER")
                    .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy quyền USER!"));

            User newUser = User.builder()
                    .email(email)
                    .fullName(fullName)
                    .avatarUrl(avatarUrl)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .isActive(true)
                    .role(userRole)
                    .build();
            return userRepository.save(newUser);
        });

        String token = jwtTokenProvider.generateTokenFromEmail(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    private GoogleIdToken verifyGoogleToken(String idTokenString) {
        try {
            NetHttpTransport transport = new NetHttpTransport();
            JsonFactory jsonFactory = GsonFactory.getDefaultInstance();

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null)
                throw new IllegalArgumentException("Định dạng ID Token không hợp lệ");

            return idToken;
        } catch (Exception e) {
            e.printStackTrace();
            throw new IllegalArgumentException("Xác thực Google thất bại: " + e.getMessage());
        }
    }
}