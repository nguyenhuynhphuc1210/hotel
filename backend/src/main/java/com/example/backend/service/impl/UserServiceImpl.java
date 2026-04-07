package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;
import com.example.backend.dto.request.ChangePasswordRequest;
import com.example.backend.dto.request.UpdateUserRequest;
import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;

import com.example.backend.mapper.UserMapper;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.CloudinaryService;
import com.example.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryService cloudinaryService;

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(userMapper::toUserResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return userRepository.findById(id)
                .map(userMapper::toUserResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với ID=" + id));
    }

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng trong hệ thống!");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy Role với ID: " + request.getRoleId()));

        User user = userMapper.toUser(request, role);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserRequest request) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với ID=" + id));

        if (request.getEmail() != null && !request.getEmail().equals(existing.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email này đã thuộc về một tài khoản khác!");
            }
            existing.setEmail(request.getEmail());
        }

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            existing.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getFullName() != null)
            existing.setFullName(request.getFullName());
        if (request.getPhone() != null)
            existing.setPhone(request.getPhone());
        if (request.getDateOfBirth() != null)
            existing.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null)
            existing.setGender(request.getGender());

        if (request.getRoleId() != null) {
            Role newRole = roleRepository.findById(request.getRoleId())
                    .orElseThrow(
                            () -> new EntityNotFoundException("Không tìm thấy Role với ID: " + request.getRoleId()));
            existing.setRole(newRole);
        }

        return userMapper.toUserResponse(userRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với ID=" + id));

        userRepository.delete(existing);
    }

    @Override
    @Transactional
    public UserResponse disableUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với ID=" + id));

        if (user.getEmail().equals(getCurrentUserEmail())) {
            throw new IllegalArgumentException("Không thể tự vô hiệu hóa chính mình");
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException("Người dùng này đã bị vô hiệu hóa trước đó.");
        }

        user.setIsActive(false);

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse enableUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với ID=" + id));

        if (Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException("Người dùng này đang hoạt động bình thường.");
        }

        user.setIsActive(true);

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getMyProfile() {
        String email = getCurrentUserEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với email: " + email));

        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateMyProfile(UpdateUserRequest req) {

        String email = getCurrentUserEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với email: " + email));

        if (req.getFullName() != null)
            user.setFullName(req.getFullName());
        if (req.getPhone() != null)
            user.setPhone(req.getPhone());
        if (req.getDateOfBirth() != null)
            user.setDateOfBirth(req.getDateOfBirth());
        if (req.getGender() != null)
            user.setGender(req.getGender());

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest req) {

        String email = getCurrentUserEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với email: " + email));

        if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác.");
        }

        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new IllegalArgumentException("Xác nhận mật khẩu mới không khớp.");
        }

        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu mới không được giống với mật khẩu hiện tại.");
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public String uploadAvatar(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File ảnh không được để trống.");
        }

        String email = getCurrentUserEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng với email: " + email));

        try {
            Map<String, Object> result = cloudinaryService.uploadImage(file, "users/" + user.getId());

            String imageUrl = (String) result.get("secure_url");
            String publicId = (String) result.get("public_id");

            if (user.getAvatarPublicId() != null) {
                try {
                    cloudinaryService.deleteImage(user.getAvatarPublicId());
                } catch (Exception ex) {
                    System.err.println("Cảnh báo: Lỗi khi xóa ảnh cũ trên Cloudinary: " + ex.getMessage());
                }
            }

            user.setAvatarUrl(imageUrl);
            user.setAvatarPublicId(publicId);
            userRepository.save(user);

            return imageUrl;

        } catch (Exception e) {
            throw new RuntimeException("Quá trình tải ảnh lên thất bại: " + e.getMessage());
        }
    }
}