package com.example.backend.service.impl;

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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomCalendarServiceImpl implements RoomCalendarService {
    private final RoomCalendarRepository roomCalendarRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomCalendarMapper roomCalendarMapper;

    @Override
    public List<RoomCalendarResponse> getAllRoomCalendars() {
        return roomCalendarRepository.findAll().stream().map(roomCalendarMapper::toRoomCalendarResponse).collect(Collectors.toList());
    }

    @Override
    public RoomCalendarResponse getRoomCalendarById(Long id) {
        return roomCalendarRepository.findById(id)
                .map(roomCalendarMapper::toRoomCalendarResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RoomCalendar not found id=" + id));
    }

    @Override
    public RoomCalendarResponse createRoomCalendar(RoomCalendarRequest request) {
        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "RoomType not found id=" + request.getRoomTypeId()));
        RoomCalendar saved = roomCalendarRepository.save(roomCalendarMapper.toRoomCalendar(request, roomType));
        return roomCalendarMapper.toRoomCalendarResponse(saved);
    }

    @Override
    public RoomCalendarResponse updateRoomCalendar(Long id, RoomCalendarRequest request) {
        RoomCalendar existing = roomCalendarRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RoomCalendar not found id=" + id));

        if (request.getRoomTypeId() != null) {
            RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "RoomType not found id=" + request.getRoomTypeId()));
            existing.setRoomType(roomType);
        }
        if (request.getDate() != null) existing.setDate(request.getDate());
        if (request.getPrice() != null) existing.setPrice(request.getPrice());
        if (request.getTotalRooms() != null) existing.setTotalRooms(request.getTotalRooms());
        if (request.getIsAvailable() != null) existing.setIsAvailable(request.getIsAvailable());

        return roomCalendarMapper.toRoomCalendarResponse(roomCalendarRepository.save(existing));
    }

    @Override
    public void deleteRoomCalendar(Long id) {
        RoomCalendar existing = roomCalendarRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RoomCalendar not found id=" + id));
        roomCalendarRepository.delete(existing);
    }
}