package com.example.backend.config;

import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;  
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.enabled}")
    private boolean seedEnabled;

    @Value("${app.seed.admin.email}")
    private String adminEmail;

    @Value("${app.seed.admin.password}")
    private String adminPassword;

    @Value("${app.seed.admin.full-name}")
    private String adminFullName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {

        if (!seedEnabled) {
            log.info("Seed disabled");
            return;
        }

        ensureRole("ROLE_USER");
        ensureRole("ROLE_HOTEL_OWNER");
        Role adminRole = ensureRole("ROLE_ADMIN");

        if (userRepository.existsByEmail(adminEmail)) {
            log.info("Admin already exists: {}", adminEmail);
            return;
        }

        User admin = User.builder()
                .email(adminEmail)
                .fullName(adminFullName)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(adminRole)
                .isActive(true)
                .build();

        userRepository.save(admin);

        log.info("Seed admin completed: {}", adminEmail);
    }

    private Role ensureRole(String roleName) {
        return roleRepository.findByRoleName(roleName).orElseGet(() -> {
            log.info("Tạo role {} nếu chưa tồn tại", roleName);
            return roleRepository.save(Role.builder().roleName(roleName).build());
        });
    }
}
