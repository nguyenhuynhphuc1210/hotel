package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;
import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeResponse;
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

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getAllRoomTypes() {

        List<RoomType> roomTypes;

        if (isAdmin()) {
            roomTypes = roomTypeRepository.findAll();
        } else if (isHotelOwner()) {
            roomTypes = roomTypeRepository.findByHotelOwnerEmail(getCurrentUserEmail());
        } else {
            roomTypes = roomTypeRepository.findByHotelIsActiveTrue();
        }

        return roomTypes.stream()
                .map(roomTypeMapper::toRoomTypeResponse)
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

        return roomTypeMapper.toRoomTypeResponse(roomTypeRepository.save(roomType));
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {

        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "RoomType not found id=" + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        existing.setTypeName(request.getTypeName());
        existing.setDescription(request.getDescription());
        existing.setMaxAdults(request.getMaxAdults());
        existing.setMaxChildren(request.getMaxChildren());
        existing.setBedType(request.getBedType());
        existing.setRoomSize(request.getRoomSize());
        existing.setBasePrice(request.getBasePrice());

        return roomTypeMapper.toRoomTypeResponse(roomTypeRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteRoomType(Long id) {

        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "RoomType not found id=" + id));

        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());

        roomTypeRepository.delete(existing);
    }
}
