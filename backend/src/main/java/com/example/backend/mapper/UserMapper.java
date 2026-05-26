package com.example.backend.mapper;

import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.request.UpdateProfileRequest;
import com.example.backend.dto.request.UpdateUserRequest;
import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toUser(UserRequest req, Role role) {
        if (req == null)
            return null;

        return User.builder()
                .email(req.getEmail())
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .role(role)
                .isActive(true)
                .build();
    }

    public User toUser(RegisterRequest req, Role role) {
        if (req == null)
            return null;

        return User.builder()
                .email(req.getEmail())
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .role(role)
                .isActive(true)
                .build();
    }

    public void updateUser(User user,
            UpdateUserRequest req,
            Role role) {

        user.setFullName(req.getFullName());
        user.setPhone(req.getPhone());
        user.setDateOfBirth(req.getDateOfBirth());
        user.setGender(req.getGender());
        user.setRole(role);
    }

    public void updateProfile(
            User user,
            UpdateProfileRequest req) {
        user.setFullName(req.getFullName());
        user.setPhone(req.getPhone());
        user.setDateOfBirth(req.getDateOfBirth());
        user.setGender(req.getGender());
    }

    public UserResponse toUserResponse(User u) {
        if (u == null)
            return null;

        return UserResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phone(u.getPhone())
                .dateOfBirth(u.getDateOfBirth())
                .gender(u.getGender())
                .avatarUrl(u.getAvatarUrl())
                .avatarPublicId(u.getAvatarPublicId())
                .roleId(u.getRole() != null ? u.getRole().getId() : null)
                .roleName(u.getRole() != null ? u.getRole().getRoleName() : null)
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}