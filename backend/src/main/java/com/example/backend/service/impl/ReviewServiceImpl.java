package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.ReviewReplyRequest;
import com.example.backend.dto.request.ReviewRequest;
import com.example.backend.dto.response.ReviewResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.Review;
import com.example.backend.entity.ReviewImage;
import com.example.backend.entity.User;
import com.example.backend.enums.BookingStatus;
import com.example.backend.mapper.ReviewMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.CloudinaryService;
import com.example.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ReviewMapper reviewMapper;
    private final HotelRepository hotelRepository;

    private final CloudinaryService cloudinaryService;

    @Override
    @Transactional

    public ReviewResponse createReview(ReviewRequest request, List<MultipartFile> files) {

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

        if (files != null && !files.isEmpty()) {
            List<ReviewImage> reviewImages = new ArrayList<>();
            try {

                String folderName = "reviews/" + booking.getHotel().getId();
                List<Map<String, Object>> uploadResults = cloudinaryService.uploadMultipleImages(files, folderName);

                for (Map<String, Object> result : uploadResults) {
                    reviewImages.add(ReviewImage.builder()
                            .imageUrl((String) result.get("secure_url"))
                            .publicId((String) result.get("public_id"))
                            .review(review)
                            .build());
                }
                review.setImages(reviewImages);
            } catch (Exception e) {
                throw new IllegalArgumentException("Lỗi trong quá trình upload ảnh đánh giá: " + e.getMessage());
            }
        }

        Review savedReview = reviewRepository.save(review);

        updateHotelStarRating(booking.getHotel().getId());

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
        Review updatedReview = reviewRepository.save(review);

        updateHotelStarRating(review.getHotel().getId());

        return reviewMapper.toReviewResponse(updatedReview);
    }

    private void updateHotelStarRating(Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        BigDecimal avgRating = reviewRepository.getAverageRating(hotelId);

        if (avgRating == null) {
            avgRating = BigDecimal.ZERO;
        }

        hotel.setStarRating(avgRating);
        hotelRepository.save(hotel);
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

    @Override
    @Transactional
    public ReviewResponse replyToReview(Long reviewId, ReviewReplyRequest request) {

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đánh giá với ID = " + reviewId));

        String currentUserEmail = getCurrentUserEmail();
        String hotelOwnerEmail = review.getHotel().getOwner().getEmail();
        
        if (!hotelOwnerEmail.equalsIgnoreCase(currentUserEmail)) {
            throw new AccessDeniedException("Bạn không có quyền phản hồi đánh giá của khách sạn này!");
        }

        review.setOwnerReply(request.getReply());
        review.setReplyDate(LocalDateTime.now());

        Review savedReview = reviewRepository.save(review);
        
        return reviewMapper.toReviewResponse(savedReview);
    }
}