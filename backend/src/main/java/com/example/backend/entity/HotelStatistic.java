package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "hotel_statistics", 
    indexes = {
        @Index(name = "idx_hs_hotel_date", columnList = "hotel_id, stat_date"),
        @Index(name = "idx_hs_date", columnList = "stat_date")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_hotel_stat_date", columnNames = {"hotel_id", "stat_date"})
    }
)
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
    @Column(name = "completed_bookings")
    private Integer completedBookings = 0;

    @Builder.Default
    @Column(name = "total_cancelled")
    private Integer totalCancelled = 0;

    @Builder.Default
    @Column(name = "total_no_show")
    private Integer totalNoShow = 0;

    @Builder.Default
    @Column(name = "gross_revenue", precision = 12, scale = 2)
    private BigDecimal grossRevenue = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_commission", precision = 12, scale = 2)
    private BigDecimal totalCommission = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "net_revenue", precision = 12, scale = 2)
    private BigDecimal netRevenue = BigDecimal.ZERO;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}