package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "room_type_amenities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(RoomTypeAmenityId.class)
public class RoomTypeAmenity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

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