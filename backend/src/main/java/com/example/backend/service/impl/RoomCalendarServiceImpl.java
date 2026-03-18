package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;
import com.example.backend.dto.request.RoomCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.entity.RoomType;
import com.example.backend.mapper.RoomCalendarMapper;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.RoomCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomCalendarServiceImpl implements RoomCalendarService {
    private final RoomCalendarRepository roomCalendarRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomCalendarMapper roomCalendarMapper;

    @Override
    @Transactional(readOnly = true)
    public List<RoomCalendarResponse> getAllRoomCalendars() {

        if (isAdmin()) {
            return roomCalendarRepository.findAll()
                    .stream()
                    .map(roomCalendarMapper::toRoomCalendarResponse)
                    .toList();
        }

        String email = getCurrentUserEmail();

        return roomCalendarRepository.findByRoomType_Hotel_Owner_Email(email)
                .stream()
                .map(roomCalendarMapper::toRoomCalendarResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoomCalendarResponse getRoomCalendarById(Long id) {
        return roomCalendarRepository.findById(id)
                .map(roomCalendarMapper::toRoomCalendarResponse)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RoomCalendar not found id=" + id));
    }

    @Override
    @Transactional
    public RoomCalendarResponse createRoomCalendar(RoomCalendarRequest request) {

        if (!isAdmin() && !isHotelOwner()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền tạo lịch phòng!");
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "RoomType not found id=" + request.getRoomTypeId()));

        if (!isAdmin()) {
            checkOwnerOrAdmin(roomType.getHotel().getOwner().getEmail());
        }

        RoomCalendar saved = roomCalendarRepository.save(
                roomCalendarMapper.toRoomCalendar(request, roomType));

        return roomCalendarMapper.toRoomCalendarResponse(saved);
    }

    @Override
    @Transactional
    public RoomCalendarResponse updateRoomCalendar(Long id, RoomCalendarRequest request) {

        RoomCalendar existing = roomCalendarRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "RoomCalendar not found id=" + id));

        if (!isAdmin()) {
            checkOwnerOrAdmin(
                    existing.getRoomType().getHotel().getOwner().getEmail());
        }

        if (request.getRoomTypeId() != null) {
            RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "RoomType not found id=" + request.getRoomTypeId()));

            if (!isAdmin()) {
                checkOwnerOrAdmin(roomType.getHotel().getOwner().getEmail());
            }

            existing.setRoomType(roomType);
        }

        if (request.getDate() != null)
            existing.setDate(request.getDate());
        if (request.getPrice() != null)
            existing.setPrice(request.getPrice());
        if (request.getTotalRooms() != null)
            existing.setTotalRooms(request.getTotalRooms());
        if (request.getIsAvailable() != null)
            existing.setIsAvailable(request.getIsAvailable());

        return roomCalendarMapper.toRoomCalendarResponse(
                roomCalendarRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteRoomCalendar(Long id) {

        RoomCalendar existing = roomCalendarRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "RoomCalendar not found id=" + id));

        if (!isAdmin()) {
            checkOwnerOrAdmin(
                    existing.getRoomType().getHotel().getOwner().getEmail());
        }

        roomCalendarRepository.delete(existing);
    }
}