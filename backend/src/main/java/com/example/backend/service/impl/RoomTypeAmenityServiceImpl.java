package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.RoomTypeAmenityRequest;
import com.example.backend.dto.response.RoomTypeAmenityResponse;
import com.example.backend.entity.*;
import com.example.backend.mapper.RoomTypeAmenityMapper;
import com.example.backend.repository.AmenityRepository;
import com.example.backend.repository.RoomTypeAmenityRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.RoomTypeAmenityService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomTypeAmenityServiceImpl implements RoomTypeAmenityService {

        private final RoomTypeAmenityRepository roomTypeAmenityRepository;
        private final RoomTypeRepository roomTypeRepository;
        private final AmenityRepository amenityRepository;
        private final RoomTypeAmenityMapper mapper;

        @Override
        @Transactional(readOnly = true)
        public List<RoomTypeAmenityResponse> getAll() {

                if (isAdmin()) {
                        return roomTypeAmenityRepository.findAll()
                                        .stream()
                                        .map(mapper::toResponse)
                                        .toList();
                }

                String email = getCurrentUserEmail();

                return roomTypeAmenityRepository.findByOwnerEmail(email)
                                        .stream()
                                        .map(mapper::toResponse)
                                        .toList();
        }

        @Override
        @Transactional(readOnly = true)
        public RoomTypeAmenityResponse getById(Long roomTypeId, Long amenityId) {

                RoomTypeAmenityId id = new RoomTypeAmenityId(roomTypeId, amenityId);

                RoomTypeAmenity entity = roomTypeAmenityRepository.findById(id)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Không tìm thấy tiện ích của loại phòng này"));

                return mapper.toResponse(entity);
        }

        @Override
        @Transactional(readOnly = true)
        public List<RoomTypeAmenityResponse> getByRoomType(Long roomTypeId) {
                return roomTypeAmenityRepository.findByRoomType_Id(roomTypeId)
                                .stream()
                                .map(mapper::toResponse)
                                .toList();
        }

        @Override
        @Transactional
        public RoomTypeAmenityResponse create(RoomTypeAmenityRequest request) {

                if (roomTypeAmenityRepository.existsByRoomType_IdAndAmenity_Id(
                                request.getRoomTypeId(), request.getAmenityId())) {
                        throw new IllegalArgumentException("Tiện ích này đã tồn tại trong loại phòng");
                }

                RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng"));

                if (!isAdmin()) {
                        checkOwnerOrAdmin(roomType.getHotel().getOwner().getEmail());
                }

                Amenity amenity = amenityRepository.findById(request.getAmenityId())
                                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tiện ích (Amenity)"));

                RoomTypeAmenity entity = mapper.toEntity(request, roomType, amenity);

                if (Boolean.TRUE.equals(entity.getIsFree())) {
                        entity.setAdditionalFee(BigDecimal.ZERO);
                } else {
                        if (entity.getAdditionalFee() == null
                                        || entity.getAdditionalFee().compareTo(BigDecimal.ZERO) <= 0) {
                                throw new IllegalArgumentException(
                                                "Tiện ích thu phí bắt buộc phải nhập giá trị phí phụ thu lớn hơn 0");
                        }
                }

                return mapper.toResponse(roomTypeAmenityRepository.save(entity));
        }

        @Override
        @Transactional
        public RoomTypeAmenityResponse update(RoomTypeAmenityRequest request) {

                RoomTypeAmenityId id = new RoomTypeAmenityId(
                                request.getRoomTypeId(),
                                request.getAmenityId());

                RoomTypeAmenity existing = roomTypeAmenityRepository.findById(id)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Không tìm thấy tiện ích của loại phòng này"));

                if (!isAdmin()) {
                        checkOwnerOrAdmin(existing.getRoomType().getHotel().getOwner().getEmail());
                }

                existing.setIsFree(request.getIsFree());

                if (Boolean.TRUE.equals(request.getIsFree())) {
                        existing.setAdditionalFee(BigDecimal.ZERO);
                } else {
                        if (request.getAdditionalFee() == null
                                        || request.getAdditionalFee().compareTo(BigDecimal.ZERO) <= 0) {
                                throw new IllegalArgumentException(
                                                "Tiện ích thu phí bắt buộc phải nhập giá trị phí phụ thu lớn hơn 0");
                        }
                        existing.setAdditionalFee(request.getAdditionalFee());
                }

                return mapper.toResponse(roomTypeAmenityRepository.save(existing));
        }

        @Override
        @Transactional
        public void delete(Long roomTypeId, Long amenityId) {

                RoomType roomType = roomTypeRepository.findById(roomTypeId)
                                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng"));

                if (!isAdmin()) {
                        checkOwnerOrAdmin(roomType.getHotel().getOwner().getEmail());
                }

                if (!roomTypeAmenityRepository.existsByRoomType_IdAndAmenity_Id(roomTypeId, amenityId)) {
                        throw new EntityNotFoundException("Không tìm thấy tiện ích trong loại phòng để xóa");
                }

                roomTypeAmenityRepository.deleteByRoomType_IdAndAmenity_Id(roomTypeId, amenityId);
        }
}