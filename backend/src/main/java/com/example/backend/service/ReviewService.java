package com.example.backend.service;

import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import org.springframework.data.domain.Page;

public interface ReviewService {
    ReviewResponse createReview(ReviewRequest request);
    ReviewResponse toggleReviewVisibility(Long reviewId);
    Page<ReviewResponse> getPublicReviews(Long hotelId, int page, int size);
    Page<ReviewResponse> getAdminReviews(Long hotelId, int page, int size);
}
