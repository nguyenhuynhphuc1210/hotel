package com.example.backend.controller;

import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeImportResponse;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse;
import com.example.backend.service.RoomTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/room-types")
@RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeService roomTypeService;

    @GetMapping
    public ResponseEntity<List<RoomTypeSummaryResponse>> getAllRoomTypes() {
        return ResponseEntity.ok(roomTypeService.getAllRoomTypes());
    }

    @GetMapping("/active")
    public ResponseEntity<List<RoomTypeSummaryResponse>> getActiveRoomTypes() {
        return ResponseEntity.ok(roomTypeService.getActiveRoomTypes());
    }

    @GetMapping("/bed-types")
    public ResponseEntity<List<String>> getAvailableBedTypes() {
        return ResponseEntity.ok(roomTypeService.getAvailableBedTypes());
    }

    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<RoomTypeSummaryResponse>> getActiveRoomTypesByHotel(@PathVariable Long hotelId) {
        return ResponseEntity.ok(roomTypeService.getActiveRoomTypesByHotel(hotelId));
    }

    @GetMapping("/hotel/{hotelId}/admin")
    public ResponseEntity<List<RoomTypeSummaryResponse>> getAllRoomTypesByHotelForManagement(@PathVariable Long hotelId) {
        return ResponseEntity.ok(roomTypeService.getAllRoomTypesByHotelForManagement(hotelId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomTypeResponse> getRoomTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(roomTypeService.getRoomTypeById(id));
    }

    @PostMapping
    public ResponseEntity<RoomTypeResponse> createRoomType(@Valid @RequestBody RoomTypeRequest request) {
        RoomTypeResponse response = roomTypeService.createRoomType(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomTypeResponse> updateRoomType(
            @PathVariable Long id,
            @Valid @RequestBody RoomTypeRequest request) {
        return ResponseEntity.ok(roomTypeService.updateRoomType(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoomType(@PathVariable Long id) {
        roomTypeService.deleteRoomType(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/deleted")
    public ResponseEntity<List<RoomTypeSummaryResponse>> getDeletedRoomTypes() {
        return ResponseEntity.ok(roomTypeService.getDeletedRoomTypes());
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<RoomTypeResponse> restoreRoomType(@PathVariable Long id) {
        return ResponseEntity.ok(roomTypeService.restoreRoomType(id));
    }

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<RoomTypeResponse> suspendRoomType(@PathVariable Long id) {
        return ResponseEntity.ok(roomTypeService.suspendRoomType(id));
    }

    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<RoomTypeResponse> reactivateRoomType(@PathVariable Long id) {
        return ResponseEntity.ok(roomTypeService.reactivateRoomType(id));
    }

    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] excelData = roomTypeService.downloadImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "room-types-import-template.xlsx");
        return new ResponseEntity<>(excelData, headers, HttpStatus.OK);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RoomTypeImportResponse> importRoomTypesFromExcel(
            @RequestParam Long hotelId,
            @RequestParam("file") MultipartFile file) {
        RoomTypeImportResponse response = roomTypeService.importRoomTypesFromExcel(hotelId, file);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}