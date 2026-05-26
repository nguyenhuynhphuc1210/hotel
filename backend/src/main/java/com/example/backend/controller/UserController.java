package com.example.backend.controller;

import com.example.backend.dto.request.*;
import com.example.backend.dto.response.AuthResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean isActive) {

        return ResponseEntity.ok(
                userService.getAllUsers(
                        page,
                        size,
                        keyword,
                        role,
                        isActive
                )
        );
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                userService.getUserById(id)
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody UserRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {

        return ResponseEntity.ok(
                userService.updateUser(id, request)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        userService.deleteUser(id);

        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/disable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> disableUser(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                userService.disableUser(id)
        );
    }

    @PatchMapping("/{id}/enable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> enableUser(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                userService.enableUser(id)
        );
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMyProfile() {

        return ResponseEntity.ok(
                userService.getMyProfile()
        );
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request) {

        return ResponseEntity.ok(
                userService.updateMyProfile(request)
        );
    }

    @PutMapping("/change-password")
    public ResponseEntity<Map<String,String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {

        userService.changePassword(request);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đổi mật khẩu thành công"
                )
        );
    }

    @PostMapping("/avatar")
    public ResponseEntity<Map<String,String>> uploadAvatar(
            @RequestParam("file") MultipartFile file) {

        String avatarUrl =
                userService.uploadAvatar(file);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Upload avatar thành công",
                        "avatarUrl", avatarUrl
                )
        );
    }

    @PostMapping("/upgrade-to-partner")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<AuthResponse> upgradeToPartner(
            @Valid @RequestBody UpgradeToPartnerRequest request) {

        return ResponseEntity.ok(
                userService.upgradeToPartner(request)
        );
    }
}