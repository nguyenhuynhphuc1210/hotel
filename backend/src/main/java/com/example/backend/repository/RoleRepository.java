package com.example.backend.repository;

import com.example.backend.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    boolean existsByRoleName(String roleName);
    
    Optional<Role> findByRoleName(String roleName);
}