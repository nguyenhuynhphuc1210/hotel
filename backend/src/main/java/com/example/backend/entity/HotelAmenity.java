package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "hotel_amenities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(HotelAmenityId.class)
public class HotelAmenity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "amenity_id", nullable = false)
    private Amenity amenity;

    @Builder.Default
    @Column(name = "is_free", nullable = false)
    private Boolean isFree = true;

    @Builder.Default
    @Column(name = "additional_fee", precision = 10, scale = 2)
    private BigDecimal additionalFee = BigDecimal.ZERO;
}