package com.example.backend.controller;

import com.example.backend.service.RoomImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/room-images")
@RequiredArgsConstructor
public class RoomImageController {

    private final RoomImageService roomImageService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImages(
            @RequestParam("roomTypeId") Long roomTypeId,
            @RequestParam("files") List<MultipartFile> files) {
        try {
            List<String> urls = roomImageService.uploadImagesForRoomType(roomTypeId, files);
            return ResponseEntity.ok(urls);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteImage(@RequestParam("publicId") String publicId) {
        try {
            roomImageService.deleteImageByPublicId(publicId);
            return ResponseEntity.ok("Xóa ảnh phòng thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/set-primary")
    public ResponseEntity<?> setPrimaryImage(@PathVariable Long id) {
        try {
            roomImageService.setPrimaryImage(id);
            return ResponseEntity.ok("Đã thiết lập ảnh đại diện phòng thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}