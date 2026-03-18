package com.example.backend.service.impl;

import com.example.backend.dto.request.RoleRequest;
import com.example.backend.dto.response.RoleResponse;
import com.example.backend.entity.Role;
import com.example.backend.mapper.RoleMapper;
import com.example.backend.repository.RoleRepository;
import com.example.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {
    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream().map(roleMapper::toRoleResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long id) {
        return roleRepository.findById(id)
                .map(roleMapper::toRoleResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found id=" + id));
    }

    @Override
    @Transactional
    public RoleResponse createRole(RoleRequest request) {

        String formattedName = formatRoleName(request.getRoleName());

        if (roleRepository.existsByRoleName(formattedName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quyền " + formattedName + " đã tồn tại!");
        }

        Role role = roleMapper.toRole(request);
        role.setRoleName(formattedName);

        return roleMapper.toRoleResponse(roleRepository.save(role));
    }

    @Override
    @Transactional
    public RoleResponse updateRole(Long id, RoleRequest request) {
        Role existing = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found id=" + id));

        String formattedName = formatRoleName(request.getRoleName());

        if (!existing.getRoleName().equals(formattedName) && roleRepository.existsByRoleName(formattedName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên quyền mới đã tồn tại!");
        }

        existing.setRoleName(formattedName);
        return roleMapper.toRoleResponse(roleRepository.save(existing));
    }

    private String formatRoleName(String name) {
        if (name == null || name.isBlank())
            return name;

        String upperName = name.trim().toUpperCase();
        if (!upperName.startsWith("ROLE_")) {
            upperName = "ROLE_" + upperName;
        }
        return upperName;
    }

    @Override
    public void deleteRole(Long id) {
        Role existing = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found id=" + id));
        roleRepository.delete(existing);
    }
}
