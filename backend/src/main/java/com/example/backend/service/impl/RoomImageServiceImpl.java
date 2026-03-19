package com.example.backend.service.impl;

import com.example.backend.entity.RoomImage;
import com.example.backend.entity.RoomType; // [cite: 73]
import com.example.backend.repository.RoomImageRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.CloudinaryService;
import com.example.backend.service.RoomImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoomImageServiceImpl implements RoomImageService {

    private final CloudinaryService cloudinaryService;
    private final RoomImageRepository roomImageRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Override
    @Transactional
    public List<String> uploadImagesForRoomType(Long roomTypeId, List<MultipartFile> files) {
        // 1. Kiểm tra loại phòng có tồn tại không
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy loại phòng với ID: " + roomTypeId));

        SecurityUtils.checkOwnerOrAdmin(
                roomType.getHotel().getOwner().getEmail());

        List<String> uploadedUrls = new ArrayList<>();
        try {
            // 2. Upload lên Cloudinary vào folder "room-types/{roomTypeId}"
            List<Map<String, Object>> uploadResults = cloudinaryService.uploadMultipleImages(files,
                    "room-types/" + roomTypeId);

            // 3. Lưu thông tin vào Database
            for (Map<String, Object> result : uploadResults) {
                String imageUrl = (String) result.get("secure_url");
                String publicId = (String) result.get("public_id");

                RoomImage roomImage = RoomImage.builder()
                        .roomType(roomType)
                        .imageUrl(imageUrl)
                        .publicId(publicId)
                        .isPrimary(false)
                        .build();

                roomImageRepository.save(roomImage);
                uploadedUrls.add(imageUrl);
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi trong quá trình upload ảnh phòng: " + e.getMessage());
        }

        return uploadedUrls;
    }

    @Override
    @Transactional
    public void deleteImageByPublicId(String publicId) {
        RoomImage roomImage = roomImageRepository.findByPublicId(publicId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ảnh phòng với Public ID: " + publicId));

        SecurityUtils.checkOwnerOrAdmin(
                roomImage.getRoomType().getHotel().getOwner().getEmail());

        try {
            cloudinaryService.deleteImage(publicId);
            roomImageRepository.delete(roomImage);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xóa ảnh phòng: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void setPrimaryImage(Long imageId) {
        RoomImage targetImage = roomImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ảnh phòng với ID: " + imageId));

        SecurityUtils.checkOwnerOrAdmin(
                targetImage.getRoomType().getHotel().getOwner().getEmail());

        Long roomTypeId = targetImage.getRoomType().getId();

        // Đưa tất cả ảnh của loại phòng này về false
        roomImageRepository.resetPrimaryImageForRoomType(roomTypeId);

        // Set ảnh đích thành true
        targetImage.setIsPrimary(true);
        roomImageRepository.save(targetImage);
    }
}