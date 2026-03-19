package com.example.backend.service;

import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface HotelImageService {
    List<String> uploadImagesForHotel(Long hotelId, List<MultipartFile> files);
    void deleteImageByPublicId(String publicId);
    void setPrimaryImage(Long imageId);
}