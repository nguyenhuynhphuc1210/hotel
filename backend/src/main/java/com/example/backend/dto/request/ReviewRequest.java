package com.example.backend.dto.request;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRequest {
    private Long bookingId;
    private BigDecimal rating;
    private String comment;

}