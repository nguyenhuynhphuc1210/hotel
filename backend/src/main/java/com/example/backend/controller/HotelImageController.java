package com.example.backend.controller;

import com.example.backend.service.HotelImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/hotel-images")
@RequiredArgsConstructor
public class HotelImageController {

    private final HotelImageService hotelImageService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImages(
            @RequestParam("hotelId") Long hotelId,
            @RequestParam("files") List<MultipartFile> files) {
        try {
            List<String> urls = hotelImageService.uploadImagesForHotel(hotelId, files);
            return ResponseEntity.ok(urls);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteImage(@RequestParam("publicId") String publicId) {
        try {
            hotelImageService.deleteImageByPublicId(publicId);
            return ResponseEntity.ok("Xóa ảnh thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/set-primary")
    public ResponseEntity<?> setPrimaryImage(@PathVariable Long id) {
        try {
            hotelImageService.setPrimaryImage(id);
            return ResponseEntity.ok("Đã thiết lập ảnh đại diện khách sạn thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}