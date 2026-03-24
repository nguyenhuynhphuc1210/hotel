package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;
import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse; // Đã thêm import
import com.example.backend.entity.Hotel;
import com.example.backend.entity.RoomType;
import com.example.backend.mapper.RoomTypeMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.RoomTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

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
            roomTypes = roomTypeRepository.findAll();
        } else if (isHotelOwner()) {
            roomTypes = roomTypeRepository.findByHotelOwnerEmail(getCurrentUserEmail());
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập trang quản trị");
        }

        return roomTypes.stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getActiveRoomTypes() {
        return roomTypeRepository.findByIsActiveTrue()
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getActiveRoomTypesByHotel(Long hotelId) {
        return roomTypeRepository.findByHotelIdAndIsActiveTrue(hotelId)
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoomTypeResponse getRoomTypeById(Long id) {

        return roomTypeRepository.findById(id)
                .map(roomTypeMapper::toRoomTypeResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RoomType not found id=" + id));
    }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Hotel not found id=" + request.getHotelId()));

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
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "RoomType not found id=" + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

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
    public void deleteRoomType(Long id) {

        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "RoomType not found id=" + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        existing.setIsActive(false);
        roomTypeRepository.save(existing);

        roomCalendarService.deactivateFutureCalendar(id);
    }
}