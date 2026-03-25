package com.example.backend.mapper;

import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Review;
import com.example.backend.entity.User;
import org.springframework.stereotype.Component;

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
                .build();
    }
}
