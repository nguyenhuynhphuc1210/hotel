package com.example.backend.controller;

import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(@RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.createReview(request));
    }

    @PatchMapping("/{id}/toggle-visibility")
    public ResponseEntity<ReviewResponse> toggleReviewVisibility(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.toggleReviewVisibility(id));
    }

    @GetMapping("/hotel/{hotelId}/public")
    public ResponseEntity<Page<ReviewResponse>> getPublicReviews(
            @PathVariable Long hotelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(reviewService.getPublicReviews(hotelId, page, size));
    }

    @GetMapping("/hotel/{hotelId}/admin")
    public ResponseEntity<Page<ReviewResponse>> getAdminReviews(
            @PathVariable Long hotelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(reviewService.getAdminReviews(hotelId, page, size));
    }
}