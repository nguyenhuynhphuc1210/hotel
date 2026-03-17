package com.example.backend.service.impl;

import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Review;
import com.example.backend.entity.User;
import com.example.backend.mapper.ReviewMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {
    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;

    private final ReviewMapper reviewMapper;

    @Override
    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll().stream().map(reviewMapper::toReviewResponse).collect(Collectors.toList());
    }

    @Override
    public ReviewResponse getReviewById(Long id) {
        return reviewRepository.findById(id)
                .map(reviewMapper::toReviewResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found id=" + id));
    }

    @Override
    public ReviewResponse createReview(ReviewRequest request) {

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Booking not found id=" + request.getBookingId()));

        User user = booking.getUser();
        Hotel hotel = booking.getHotel();

        Review review = reviewMapper.toReview(request, booking, user);

        review.setHotel(hotel);

        Review saved = reviewRepository.save(review);

        BigDecimal avg = reviewRepository.getAverageRating(hotel.getId());
        hotel.setStarRating(avg);
        hotelRepository.save(hotel);

        return reviewMapper.toReviewResponse(saved);
    }

    @Override
    public ReviewResponse updateReview(Long id, ReviewRequest request) {

        Review existing = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Review not found id=" + id));

        if (request.getRating() != null) {
            existing.setRating(request.getRating());
        }

        if (request.getComment() != null) {
            existing.setComment(request.getComment());
        }

        Review saved = reviewRepository.save(existing);

        return reviewMapper.toReviewResponse(saved);
    }

    @Override
    public void deleteReview(Long id) {
        Review existing = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found id=" + id));
        reviewRepository.delete(existing);
    }
}
