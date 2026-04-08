package com.example.backend.service;

import com.example.backend.dto.request.ReviewReplyRequest;
import com.example.backend.dto.request.ReviewReportRequest;
import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ReviewService {

    ReviewResponse createReview(ReviewRequest request, List<MultipartFile> files);
    ReviewResponse toggleReviewVisibility(Long reviewId);
    Page<ReviewResponse> getPublicReviews(Long hotelId, int page, int size);
    Page<ReviewResponse> getAdminReviews(Long hotelId, int page, int size);
    ReviewResponse replyToReview(Long reviewId, ReviewReplyRequest request);
    ReviewResponse reportReview(Long reviewId, ReviewReportRequest request);
    Page<ReviewResponse> getReportedReviews(int page, int size);
    ReviewResponse resolveReport(Long reviewId, boolean isHideApproved);
}