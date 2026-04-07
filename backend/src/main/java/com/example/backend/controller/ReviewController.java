package com.example.backend.controller;

import com.example.backend.dto.request.ReviewReplyRequest;
import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.service.ReviewService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReviewResponse> createReview(
            @Valid @RequestPart("data") ReviewRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        
        ReviewResponse response = reviewService.createReview(request, files);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

    @PatchMapping("/{id}/reply")
    public ResponseEntity<ReviewResponse> replyToReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewReplyRequest request) {
            
        ReviewResponse response = reviewService.replyToReview(id, request);
        return ResponseEntity.ok(response);
    }
}