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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
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
        if (request.getAvatarUrl() != null)
            existing.setAvatarUrl(request.getAvatarUrl());

        if (request.getRoleId() != null) {
            Role newRole = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy Role với ID: " + request.getRoleId()));
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

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException("Người dùng này đã bị vô hiệu hóa trước đó."); // Dùng IllegalArgumentException
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
}