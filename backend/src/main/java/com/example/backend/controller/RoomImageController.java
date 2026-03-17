package com.example.backend.controller;

import com.example.backend.dto.request.RoomImageRequest;
import com.example.backend.dto.response.RoomImageResponse;
import com.example.backend.service.RoomImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/room-images")
@RequiredArgsConstructor
public class RoomImageController {

    private final RoomImageService roomImageService;

    @GetMapping
    public ResponseEntity<List<RoomImageResponse>> getAll() {
        return ResponseEntity.ok(roomImageService.getAllRoomImages());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomImageResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(roomImageService.getRoomImageById(id));
    }

    @PostMapping
    public ResponseEntity<RoomImageResponse> create(
            @RequestBody RoomImageRequest request) {

        RoomImageResponse created =
                roomImageService.createRoomImage(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomImageResponse> update(
            @PathVariable Long id,
            @RequestBody RoomImageRequest request) {

        return ResponseEntity.ok(
                roomImageService.updateRoomImage(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {

        roomImageService.deleteRoomImage(id);

        return ResponseEntity.noContent().build();
    }
}