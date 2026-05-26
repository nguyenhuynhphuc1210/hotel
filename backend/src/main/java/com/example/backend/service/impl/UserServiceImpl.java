package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.getCurrentUserEmail;

import com.example.backend.dto.request.*;
import com.example.backend.dto.response.AuthResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.mapper.UserMapper;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenProvider;
import com.example.backend.service.CloudinaryService;
import com.example.backend.service.UserService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;
    private final JwtTokenProvider jwtTokenProvider;

    private User getCurrentUser() {
        String email = getCurrentUserEmail();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy người dùng: " + email));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(
            int page,
            int size,
            String keyword,
            String role,
            Boolean isActive) {

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        return userRepository.searchUsers(
                keyword,
                role,
                isActive,
                pageable)
                .map(userMapper::toUserResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {

        return userRepository.findById(id)
                .map(userMapper::toUserResponse)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy người dùng ID = " + id));
    }

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException(
                    "Email đã tồn tại");
        }

        Role role = roleRepository.findById(
                request.getRoleId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy Role"));

        User user = userMapper.toUser(
                request,
                role);

        user.setPasswordHash(
                passwordEncoder.encode(
                        request.getPassword()));

        return userMapper.toUserResponse(
                userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateUser(
            Long id,
            UpdateUserRequest request) {

        User existing = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy người dùng"));


        Role role = existing.getRole();

        if (!request.getRoleId()
                .equals(existing.getRole().getId())) {

            User currentUser = getCurrentUser();

            if (existing.getId()
                    .equals(currentUser.getId())) {

                throw new IllegalArgumentException(
                        "Không thể tự thay đổi quyền của chính mình");
            }

            role = roleRepository.findById(
                    request.getRoleId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Không tìm thấy Role"));
        }

        userMapper.updateUser(
                existing,
                request,
                role);

        return userMapper.toUserResponse(
                userRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy người dùng"));

        userRepository.delete(user);
    }

    @Override
    @Transactional
    public UserResponse disableUser(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy người dùng"));

        User currentUser = getCurrentUser();

        if (user.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException(
                    "Không thể tự khóa tài khoản");
        }

        user.setIsActive(false);

        return userMapper.toUserResponse(
                userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse enableUser(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy người dùng"));

        user.setIsActive(true);

        return userMapper.toUserResponse(
                userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getMyProfile() {

        return userMapper.toUserResponse(
                getCurrentUser());
    }

    @Override
    @Transactional
    public UserResponse updateMyProfile(
            UpdateProfileRequest req) {

        User user = getCurrentUser();

        userMapper.updateProfile(
                user,
                req);

        return userMapper.toUserResponse(
                userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(
            ChangePasswordRequest req) {

        User user = getCurrentUser();

        if (!passwordEncoder.matches(
                req.getOldPassword(),
                user.getPasswordHash())) {

            throw new IllegalArgumentException(
                    "Mật khẩu hiện tại không đúng");
        }

        if (!req.getNewPassword()
                .equals(req.getConfirmPassword())) {

            throw new IllegalArgumentException(
                    "Xác nhận mật khẩu không khớp");
        }

        user.setPasswordHash(
                passwordEncoder.encode(
                        req.getNewPassword()));

        userRepository.save(user);
    }

    @Override
    @Transactional
    public String uploadAvatar(
            MultipartFile file) {

        User user = getCurrentUser();

        try {

            Map<String, Object> result = cloudinaryService.uploadImage(
                    file,
                    "users/" + user.getId());

            if (user.getAvatarPublicId() != null) {
                cloudinaryService.deleteImage(
                        user.getAvatarPublicId());
            }

            user.setAvatarUrl(
                    (String) result.get("secure_url"));

            user.setAvatarPublicId(
                    (String) result.get("public_id"));

            userRepository.save(user);

            return user.getAvatarUrl();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Upload ảnh thất bại: "
                            + e.getMessage());
        }
    }

    @Override
    @Transactional
    public AuthResponse upgradeToPartner(
            UpgradeToPartnerRequest request) {

        User user = getCurrentUser();

        if ("ROLE_HOTEL_OWNER"
                .equals(user.getRole().getRoleName())) {

            throw new IllegalArgumentException(
                    "Tài khoản đã là đối tác");
        }

        Role role = roleRepository
                .findByRoleName(
                        "ROLE_HOTEL_OWNER")
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy Role"));

        user.setRole(role);
        user.setPhone(request.getPhone());

        User saved = userRepository.save(user);

        String token = jwtTokenProvider.generateTokenFromEmail(
                saved.getEmail());

        return new AuthResponse(
                token,
                userMapper.toUserResponse(saved));
    }
}