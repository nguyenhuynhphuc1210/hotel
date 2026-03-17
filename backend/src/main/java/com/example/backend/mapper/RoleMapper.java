package com.example.backend.mapper;

import com.example.backend.dto.request.RoleRequest;
import com.example.backend.dto.response.RoleResponse;
import com.example.backend.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class RoleMapper {
    public Role toRole(RoleRequest req) {
        if (req == null) return null;
        return Role.builder()
                .roleName(req.getRoleName())
                .build();
    }

    public RoleResponse toRoleResponse(Role role) {
        if (role == null) return null;
        return RoleResponse.builder()
                .id(role.getId())
                .roleName(role.getRoleName())
                .createdAt(role.getCreatedAt())
                .build();
    }
}
