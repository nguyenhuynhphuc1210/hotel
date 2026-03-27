package com.example.backend.service.impl;

import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Review;
import com.example.backend.entity.User;
import com.example.backend.enums.BookingStatus;
import com.example.backend.mapper.ReviewMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ReviewMapper reviewMapper;
    private final HotelRepository hotelRepository;

    @Override
    @Transactional
    public ReviewResponse createReview(ReviewRequest request) {

        if (request.getRating() == null || request.getRating().compareTo(BigDecimal.ONE) < 0
                || request.getRating().compareTo(BigDecimal.valueOf(5)) > 0) {
            throw new IllegalArgumentException("Điểm đánh giá phải nằm trong khoảng từ 1.0 đến 5.0");
        }

        String email = SecurityUtils.getCurrentUserEmail();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thông tin tài khoản"));

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đơn đặt phòng"));

        if (booking.getUser() == null || !booking.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Bạn không có quyền đánh giá đơn đặt phòng này");
        }

        if (booking.getHotel().getOwner().getEmail().equals(currentUser.getEmail())) {
            throw new AccessDeniedException("Chủ khách sạn không được phép tự đánh giá khách sạn của mình!");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalArgumentException("Chỉ có thể gửi đánh giá khi đơn đặt phòng đã hoàn tất (COMPLETED)");
        }

        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new IllegalArgumentException("Bạn đã gửi đánh giá cho đơn đặt phòng này rồi");
        }

        Review review = reviewMapper.toReview(request, booking, currentUser);
        Review savedReview = reviewRepository.save(review);

        return reviewMapper.toReviewResponse(savedReview);
    }

    @Override
    @Transactional
    public ReviewResponse toggleReviewVisibility(Long reviewId) {

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId));

        if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Chỉ Admin hệ thống mới có quyền ẩn hoặc hiện đánh giá!");
        }

        review.setIsPublished(!review.getIsPublished());

        return reviewMapper.toReviewResponse(reviewRepository.save(review));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getPublicReviews(Long hotelId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        return reviewRepository.findByHotelIdAndIsPublishedTrueOrderByCreatedAtDesc(hotelId, pageable)
                .map(reviewMapper::toReviewResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getAdminReviews(Long hotelId, int page, int size) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        if (SecurityUtils.isHotelOwner()) {
            String ownerEmail = SecurityUtils.getCurrentUserEmail();
            if (!hotel.getOwner().getEmail().equals(ownerEmail)) {
                throw new AccessDeniedException("Bạn không có quyền xem dữ liệu quản trị của khách sạn khác!");
            }
        } else if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Bạn không có quyền truy cập dữ liệu này");
        }

        Pageable pageable = PageRequest.of(page, size);
        return reviewRepository.findByHotelIdOrderByCreatedAtDesc(hotelId, pageable)
                .map(reviewMapper::toReviewResponse);
    }
}