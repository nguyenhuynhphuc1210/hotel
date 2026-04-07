package com.example.backend.service;

import com.example.backend.dto.request.ChangePasswordRequest;
import com.example.backend.dto.request.UpdateUserRequest;
import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    List<UserResponse> getAllUsers();

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