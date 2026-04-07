package com.example.backend.mapper;

import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewImageResponse;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Review;
import com.example.backend.entity.ReviewImage;
import com.example.backend.entity.User;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ReviewMapper {

    public Review toReview(ReviewRequest req, Booking booking, User user) {
        if (req == null) return null;
        return Review.builder()
                .booking(booking)
                .user(user)
                .hotel(booking != null ? booking.getHotel() : null)
                .rating(req.getRating())
                .comment(req.getComment())
                .isPublished(true)

                .build();
    }

    public ReviewResponse toReviewResponse(Review r) {
        if (r == null) return null;

        List<ReviewImageResponse> imageResponses = r.getImages() == null 
                ? Collections.emptyList() 
                : r.getImages().stream()
                        .map(this::toReviewImageResponse)
                        .collect(Collectors.toList());

        return ReviewResponse.builder()
                .id(r.getId())
                .bookingId(r.getBooking() != null ? r.getBooking().getId() : null)
                .userId(r.getUser() != null ? r.getUser().getId() : null)
                .userName(r.getUser() != null ? r.getUser().getFullName() : null)
                .hotelId(r.getHotel() != null ? r.getHotel().getId() : null)
                .hotelName(r.getHotel() != null ? r.getHotel().getHotelName() : null)
                .rating(r.getRating())
                .comment(r.getComment())
                .isPublished(r.getIsPublished())
                .createdAt(r.getCreatedAt())
                // --- THÊM 3 TRƯỜNG MỚI VÀO ĐÂY ---
                .ownerReply(r.getOwnerReply())
                .replyDate(r.getReplyDate())
                .images(imageResponses)
                .build();
    }

    public ReviewImageResponse toReviewImageResponse(ReviewImage reviewImage) {
        if (reviewImage == null) return null;

        return ReviewImageResponse.builder()
                .id(reviewImage.getId())
                .imageUrl(reviewImage.getImageUrl())
                .publicId(reviewImage.getPublicId())
                .build();
    }
}