package com.example.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://192.168.*.*:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                // Báo cho Spring biết đây là API Stateless (không dùng Session lưu trạng thái)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers("/api/auth/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/room-types").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/room-types/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/room-types").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/room-types/*").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/room-types/*").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers(HttpMethod.GET, "/api/hotels").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/hotels/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/hotels").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/hotels/*").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotels/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/hotels/*/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/amenities/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/amenities").hasAnyRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/amenities/**").hasAnyRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/amenities/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/hotel-amenities/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/hotel-amenities").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/hotel-amenities/**").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotel-amenities/**")
                        .hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers(HttpMethod.GET, "/api/promotions/**").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.POST, "/api/promotions").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/promotions/**").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/promotions/**").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers(HttpMethod.GET, "/api/hotel-policies/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/hotel-policies").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/hotel-policies/**").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotel-policies/**").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        
                        .requestMatchers(HttpMethod.POST, "/api/hotel-images/upload").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/hotel-images/**").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/hotel-images/**").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers(HttpMethod.POST, "/api/room-images/upload").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/room-images/**").hasAnyRole("ADMIN", "HOTEL_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/room-images/**").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers(HttpMethod.GET, "/api/room-calendars/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/room-calendars/**").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers(HttpMethod.POST, "/api/bookings").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bookings/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/bookings/*/cancel").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/bookings/*/status").hasAnyRole("ADMIN", "HOTEL_OWNER")

                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/roles/**").hasRole("ADMIN")

                        .anyRequest().authenticated())

                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}