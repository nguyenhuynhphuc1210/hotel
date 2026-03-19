package com.example.backend.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;

public interface CloudinaryService {
    Map<String, Object> uploadImage(MultipartFile file, String folderName) throws IOException;
    List<Map<String, Object>> uploadMultipleImages(List<MultipartFile> files, String folderName) throws IOException;
    void deleteImage(String publicId) throws IOException;
}