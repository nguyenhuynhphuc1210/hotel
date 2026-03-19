package com.example.backend.service;

import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface RoomImageService {
    List<String> uploadImagesForRoomType(Long roomTypeId, List<MultipartFile> files);

    void deleteImageByPublicId(String publicId);

    void setPrimaryImage(Long imageId);
}