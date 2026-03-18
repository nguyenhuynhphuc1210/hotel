package com.example.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

public class SecurityUtils {

    public static Authentication getAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn chưa đăng nhập");
        }

        return auth;
    }

    public static String getCurrentUserEmail() {
        return getAuth().getName();
    }

    public static boolean isAdmin() {
        return getAuth().getAuthorities().stream()
                .anyMatch(r -> r.getAuthority().equals("ROLE_ADMIN"));
    }

    public static boolean isHotelOwner() {
        return getAuth().getAuthorities().stream()
                .anyMatch(r -> r.getAuthority().equals("ROLE_HOTEL_OWNER"));
    }

    public static void checkOwnerOrAdmin(String ownerEmail) {
        if (!isAdmin() && !ownerEmail.equals(getCurrentUserEmail())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thực hiện thao tác này!"
            );
        }
    }
}