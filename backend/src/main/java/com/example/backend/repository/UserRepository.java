package com.example.backend.repository;

import com.example.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = {"role"})
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u.id FROM User u WHERE u.email = :email")
    Long findIdByEmail(@Param("email") String email);

    @Query("""
            SELECT u FROM User u
            WHERE (
                CAST(:keyword AS text) IS NULL
                OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%'))
                OR u.phone LIKE CONCAT('%', CAST(:keyword AS text), '%')
            )
            AND (
                CAST(:role AS text) IS NULL 
                OR u.role.roleName = :role
            )
            AND (
                :isActive IS NULL 
                OR u.isActive = :isActive
            )
            """)
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("role") String role,
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}