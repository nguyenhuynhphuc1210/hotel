package com.example.backend.service;

import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeImportResponse;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RoomTypeService {
    List<RoomTypeSummaryResponse> getAllRoomTypes();
    List<RoomTypeSummaryResponse> getActiveRoomTypes();
    List<String> getAvailableBedTypes();
    List<RoomTypeSummaryResponse> getActiveRoomTypesByHotel(Long hotelId);
    List<RoomTypeSummaryResponse> getAllRoomTypesByHotelForManagement(Long hotelId);
    RoomTypeResponse getRoomTypeById(Long id);
    RoomTypeResponse createRoomType(RoomTypeRequest request);
    RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request);
    void deleteRoomType(Long id);
    RoomTypeResponse restoreRoomType(Long id);
    List<RoomTypeSummaryResponse> getDeletedRoomTypes();
    RoomTypeResponse suspendRoomType(Long id);
    RoomTypeResponse reactivateRoomType(Long id);
    byte[] downloadImportTemplate();
    RoomTypeImportResponse importRoomTypesFromExcel(Long hotelId, MultipartFile file);
}
