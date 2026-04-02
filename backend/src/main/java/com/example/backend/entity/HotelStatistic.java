package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "hotel_statistics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelStatistic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Builder.Default
    @Column(name = "total_bookings")
    private Integer totalBookings = 0;

    @Builder.Default
    @Column(name = "total_cancelled")
    private Integer totalCancelled = 0;

    @Builder.Default
    @Column(name = "total_no_show")
    private Integer totalNoShow = 0;

    @Builder.Default
    @Column(name = "total_revenue", precision = 12, scale = 2)
    private BigDecimal totalRevenue = BigDecimal.ZERO;
}