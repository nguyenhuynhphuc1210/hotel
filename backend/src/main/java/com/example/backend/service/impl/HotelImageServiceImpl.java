package com.example.backend.service.impl;

import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelImage;
import com.example.backend.repository.HotelImageRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.CloudinaryService;
import com.example.backend.service.HotelImageService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.EntityNotFoundException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HotelImageServiceImpl implements HotelImageService {

    private final CloudinaryService cloudinaryService;
    private final HotelImageRepository hotelImageRepository;
    private final HotelRepository hotelRepository;

    @Override
    @Transactional
    public List<String> uploadImagesForHotel(
            Long hotelId,
            List<MultipartFile> files) {

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy khách sạn với ID: " + hotelId));

        SecurityUtils.checkOwnerOrAdmin(
                hotel.getOwner().getEmail());

        try {

            List<Map<String, Object>> uploadResults = cloudinaryService.uploadMultipleImages(
                    files,
                    "hotels/" + hotelId);

            boolean hasPrimaryImage = hotelImageRepository
                    .existsByHotel_IdAndIsPrimaryTrue(hotelId);

            List<HotelImage> hotelImages = new ArrayList<>();
            List<String> uploadedUrls = new ArrayList<>();

            boolean setFirstImageAsPrimary = !hasPrimaryImage;

            for (Map<String, Object> result : uploadResults) {

                String imageUrl = (String) result.get("secure_url");

                String publicId = (String) result.get("public_id");

                HotelImage hotelImage = HotelImage.builder()
                        .hotel(hotel)
                        .imageUrl(imageUrl)
                        .publicId(publicId)
                        .isPrimary(setFirstImageAsPrimary)
                        .build();

                hotelImages.add(hotelImage);
                uploadedUrls.add(imageUrl);

                setFirstImageAsPrimary = false;
            }

            hotelImageRepository.saveAll(hotelImages);

            return uploadedUrls;

        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Lỗi upload ảnh: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void deleteImageByPublicId(String publicId) {

        HotelImage hotelImage = hotelImageRepository.findByPublicId(publicId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy ảnh"));

        SecurityUtils.checkOwnerOrAdmin(
                hotelImage.getHotel()
                        .getOwner()
                        .getEmail());

        try {

            Long hotelId = hotelImage.getHotel().getId();

            boolean wasPrimary = Boolean.TRUE.equals(hotelImage.getIsPrimary());

            cloudinaryService.deleteImage(publicId);

            hotelImageRepository.delete(hotelImage);

            if (wasPrimary) {

                hotelImageRepository
                        .findFirstByHotel_IdOrderByIdAsc(hotelId)
                        .ifPresent(image -> {

                            image.setIsPrimary(true);

                            hotelImageRepository.save(image);
                        });
            }

        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Lỗi khi xóa ảnh: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void setPrimaryImage(Long imageId) {

        HotelImage targetImage = hotelImageRepository.findById(imageId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy ảnh"));

        SecurityUtils.checkOwnerOrAdmin(
                targetImage.getHotel()
                        .getOwner()
                        .getEmail());

        Long hotelId = targetImage.getHotel().getId();

        hotelImageRepository
                .resetPrimaryImageForHotel(hotelId);

        targetImage.setIsPrimary(true);

        hotelImageRepository.save(targetImage);
    }
}