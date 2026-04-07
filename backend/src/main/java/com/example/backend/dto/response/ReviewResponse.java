package com.example.backend.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List; 

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long bookingId;
    private Long userId;
    private String userName;
    private Long hotelId;
    private String hotelName;
    private BigDecimal rating;
    private String comment;
    private Boolean isPublished;
    private LocalDateTime createdAt;

    private String ownerReply;

    private LocalDateTime replyDate;

    private List<ReviewImageResponse> images;
}