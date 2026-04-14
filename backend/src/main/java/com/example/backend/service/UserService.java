package com.example.backend.service;

import com.example.backend.dto.request.ChangePasswordRequest;
import com.example.backend.dto.request.UpdateUserRequest;
import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;

public interface UserService {
    Page<UserResponse> getAllUsers(int page, int size);

    UserResponse getUserById(Long id);

    UserResponse createUser(UserRequest request);

    UserResponse updateUser(Long id, UserRequest request);

    void deleteUser(Long id);

    UserResponse disableUser(Long id);

    UserResponse enableUser(Long id);

    UserResponse getMyProfile();

    UserResponse updateMyProfile(UpdateUserRequest request);

    void changePassword(ChangePasswordRequest request);

    String uploadAvatar(MultipartFile file);
}