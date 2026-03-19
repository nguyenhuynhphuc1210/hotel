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
    public List<String> uploadImagesForHotel(Long hotelId, List<MultipartFile> files) {

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách sạn với ID: " + hotelId));

        SecurityUtils.checkOwnerOrAdmin(hotel.getOwner().getEmail());

        List<String> uploadedUrls = new ArrayList<>();
        try {

            List<Map<String, Object>> uploadResults = cloudinaryService.uploadMultipleImages(files,
                    "hotels/" + hotelId);

            for (Map<String, Object> result : uploadResults) {
                String imageUrl = (String) result.get("secure_url");
                String publicId = (String) result.get("public_id");

                HotelImage hotelImage = HotelImage.builder()
                        .hotel(hotel)
                        .imageUrl(imageUrl)
                        .publicId(publicId)
                        .isPrimary(false)
                        .build();

                hotelImageRepository.save(hotelImage);
                uploadedUrls.add(imageUrl);
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi trong quá trình upload ảnh: " + e.getMessage());
        }

        return uploadedUrls;
    }

    @Override
    @Transactional
    public void deleteImageByPublicId(String publicId) {

        HotelImage hotelImage = hotelImageRepository.findByPublicId(publicId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ảnh với Public ID: " + publicId));

        SecurityUtils.checkOwnerOrAdmin(
                hotelImage.getHotel().getOwner().getEmail());
        try {

            cloudinaryService.deleteImage(publicId);

            hotelImageRepository.delete(hotelImage);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xóa ảnh: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void setPrimaryImage(Long imageId) {

        HotelImage targetImage = hotelImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ảnh với ID: " + imageId));

        SecurityUtils.checkOwnerOrAdmin(
                targetImage.getHotel().getOwner().getEmail());

        Long hotelId = targetImage.getHotel().getId();

        hotelImageRepository.resetPrimaryImageForHotel(hotelId);

        targetImage.setIsPrimary(true);
        hotelImageRepository.save(targetImage);
    }
}