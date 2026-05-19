package com.example.backend.repository;

import com.example.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);

    boolean existsByEmail(String email);

    @Query("SELECT u.id FROM User u WHERE u.email = :email")
    Long findIdByEmail(@Param("email") String email);

    @Query("""
                SELECT u
                FROM User u
                WHERE
                    (
                        :keyword IS NULL
                        OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                        OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                        OR u.phone LIKE CONCAT('%', :keyword, '%')
                    )
                AND
                    (
                        :role IS NULL
                        OR u.role.roleName = :role
                    )
            """)
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("role") String role,
            Pageable pageable);
}