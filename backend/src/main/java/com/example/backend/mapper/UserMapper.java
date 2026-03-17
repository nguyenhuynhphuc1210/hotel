package com.example.backend.mapper;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public User toUser(UserRequest req, Role role) {
        if (req == null) return null;
        return User.builder()
                .email(req.getEmail())
                .passwordHash(req.getPassword())
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .avatarUrl(req.getAvatarUrl())
                .role(role)
                .isActive(true)
                .build();
    }

    public UserResponse toUserResponse(User u) {
        if (u == null) return null;
        return UserResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phone(u.getPhone())
                .dateOfBirth(u.getDateOfBirth())
                .gender(u.getGender())
                .avatarUrl(u.getAvatarUrl())
                .roleId(u.getRole() != null ? u.getRole().getId() : null)
                .roleName(u.getRole() != null ? u.getRole().getRoleName() : null)
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
