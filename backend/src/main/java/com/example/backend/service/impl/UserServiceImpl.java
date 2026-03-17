package com.example.backend.service.impl;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.mapper.UserMapper;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found id=" + id));
    }

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request) {
        Role role = roleRepository.findByRoleName("ROLE_USER")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Default role USER not found"));

        User user = userMapper.toUser(request, role);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserRequest request) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found id=" + id));

        // Đã xóa phần cập nhật Role bằng request.getRoleId()

        if (request.getEmail() != null)
            existing.setEmail(request.getEmail());

        // Lưu ý: Chỉ băm và cập nhật mật khẩu nếu người dùng có gửi mật khẩu mới lên
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
        if (request.getAvatarUrl() != null)
            existing.setAvatarUrl(request.getAvatarUrl());
        if (request.getIsActive() != null)
            existing.setIsActive(request.getIsActive());

        return userMapper.toUserResponse(userRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found id=" + id));
        userRepository.delete(existing);
    }
}
