package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.RoomType;
import com.example.backend.mapper.RoomTypeMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.RoomTypeService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomTypeServiceImpl implements RoomTypeService {

    private final RoomTypeRepository roomTypeRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeMapper roomTypeMapper;
    private final RoomCalendarServiceImpl roomCalendarService;

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getAllRoomTypes() {
        List<RoomType> roomTypes;

        if (isAdmin()) {
            roomTypes = roomTypeRepository.findAllNotDeletedSystemRoomTypes();
        } else if (isHotelOwner()) {
            roomTypes = roomTypeRepository.findAllNotDeletedRoomTypesByOwner(getCurrentUserEmail());
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập trang quản trị");
        }

        return roomTypes.stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getActiveRoomTypes() {
        return roomTypeRepository.findByIsActiveTrueAndDeletedAtIsNull()
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getActiveRoomTypesByHotel(Long hotelId) {
        return roomTypeRepository.findActiveRoomTypesByHotel(hotelId)
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getAllRoomTypesByHotelForManagement(Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + hotelId));

        checkOwnerOrAdmin(hotel.getOwner().getEmail());

        return roomTypeRepository.findByHotelIdAndDeletedAtIsNull(hotelId)
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoomTypeResponse getRoomTypeById(Long id) {
        return roomTypeRepository.findById(id)
                .map(roomTypeMapper::toRoomTypeResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));
    }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(
                        () -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + request.getHotelId()));

        checkOwnerOrAdmin(hotel.getOwner().getEmail());

        RoomType roomType = roomTypeMapper.toRoomType(request, hotel);

        RoomType savedRoomType = roomTypeRepository.save(roomType);

        roomCalendarService.generateCalendarForNewRoomType(savedRoomType);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() != null) {
            throw new IllegalArgumentException("Không thể cập nhật thông tin loại phòng đang nằm trong thùng rác!");
        }

        boolean isPriceChanged = existing.getBasePrice().compareTo(request.getBasePrice()) != 0;
        boolean isRoomsChanged = !existing.getTotalRooms().equals(request.getTotalRooms());

        existing.setTypeName(request.getTypeName());
        existing.setDescription(request.getDescription());
        existing.setMaxAdults(request.getMaxAdults());
        existing.setMaxChildren(request.getMaxChildren());
        existing.setBedType(request.getBedType());
        existing.setRoomSize(request.getRoomSize());
        existing.setBasePrice(request.getBasePrice());
        existing.setTotalRooms(request.getTotalRooms());
        existing.setIsNonSmoking(request.getIsNonSmoking());

        RoomType savedRoomType = roomTypeRepository.save(existing);

        if (isPriceChanged || isRoomsChanged) {
            roomCalendarService.syncFutureCalendar(
                    savedRoomType.getId(),
                    isPriceChanged ? savedRoomType.getBasePrice() : null,
                    isRoomsChanged ? savedRoomType.getTotalRooms() : null);
        }

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse suspendRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() != null) {
            throw new IllegalArgumentException("Không thể tạm ngưng loại phòng đã bị xóa!");
        }

        if (!Boolean.TRUE.equals(existing.getIsActive())) {
            throw new IllegalArgumentException("Loại phòng này đã được tạm ngưng trước đó.");
        }

        existing.setIsActive(false);
        RoomType savedRoomType = roomTypeRepository.save(existing);

        roomCalendarService.deactivateFutureCalendar(id);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse reactivateRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() != null) {
            throw new IllegalArgumentException("Không thể mở bán loại phòng đang nằm trong thùng rác!");
        }

        if (Boolean.TRUE.equals(existing.getIsActive())) {
            throw new IllegalArgumentException("Loại phòng này hiện vẫn đang được mở bán.");
        }

        existing.setIsActive(true);
        RoomType savedRoomType = roomTypeRepository.save(existing);

        roomCalendarService.reactivateFutureCalendar(id);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public void deleteRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        existing.setDeletedAt(LocalDateTime.now());
        existing.setIsActive(false);
        roomTypeRepository.save(existing);

        roomCalendarService.deactivateFutureCalendar(id);
    }

    @Override
    @Transactional
    public RoomTypeResponse restoreRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() == null) {
            throw new IllegalArgumentException("Loại phòng này không nằm trong thùng rác.");
        }

        if (existing.getHotel().getDeletedAt() != null) {
            throw new IllegalArgumentException(
                    "Khách sạn của loại phòng này đang bị xóa. Vui lòng khôi phục khách sạn trước.");
        }

        existing.setDeletedAt(null);
        existing.setIsActive(false);

        RoomType savedRoomType = roomTypeRepository.save(existing);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getDeletedRoomTypes() {
        List<RoomType> deletedTypes;

        if (isAdmin()) {
            deletedTypes = roomTypeRepository.findByDeletedAtIsNotNull();
        } else if (isHotelOwner()) {
            deletedTypes = roomTypeRepository.findDeletedRoomTypesByOwner(getCurrentUserEmail());
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập trang này");
        }

        return deletedTypes.stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }
}