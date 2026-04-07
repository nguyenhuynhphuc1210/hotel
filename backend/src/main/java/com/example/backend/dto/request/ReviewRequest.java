package com.example.backend.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.example.backend.dto.response.ReviewImageResponse;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRequest {
    private Long bookingId;
    private BigDecimal rating;
    private String comment;
    private String ownerReply;
    private LocalDateTime replyDate;
    private List<ReviewImageResponse> images;
}