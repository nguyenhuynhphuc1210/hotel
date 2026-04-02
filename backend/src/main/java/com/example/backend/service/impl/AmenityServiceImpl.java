package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.AmenityRequest;
import com.example.backend.dto.response.AmenityResponse;
import com.example.backend.entity.Amenity;
import com.example.backend.enums.AmenityType;
import com.example.backend.mapper.AmenityMapper;
import com.example.backend.repository.AmenityRepository;
import com.example.backend.service.AmenityService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.access.AccessDeniedException;
import jakarta.persistence.EntityNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AmenityServiceImpl implements AmenityService {
    private final AmenityRepository amenityRepository;
    private final AmenityMapper amenityMapper;

    @Override
    @Transactional(readOnly = true)
    public List<AmenityResponse> getAllAmenities() {
        return amenityRepository.findAll().stream()
                .map(amenityMapper::toAmenityResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmenityResponse> getAmenitiesByType(AmenityType type) {
        return amenityRepository.findByType(type)
                .stream()
                .map(amenityMapper::toAmenityResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AmenityResponse getAmenityById(Long id) {
        return amenityRepository.findById(id)
                .map(amenityMapper::toAmenityResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tiện ích với ID = " + id));
    }

    @Override
    @Transactional
    public AmenityResponse createAmenity(AmenityRequest request) {

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được thêm tiện ích!");
        }

        if (amenityRepository.existsByAmenityName(request.getAmenityName())) {
            throw new IllegalArgumentException("Tên tiện ích '" + request.getAmenityName() + "' đã tồn tại!");
        }

        Amenity saved = amenityRepository.save(amenityMapper.toAmenity(request));
        return amenityMapper.toAmenityResponse(saved);
    }

    @Override
    @Transactional
    public AmenityResponse updateAmenity(Long id, AmenityRequest request) {

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được cập nhật tiện ích!");
        }

        Amenity existing = amenityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tiện ích với ID = " + id));

        if (amenityRepository.existsByAmenityNameAndIdNot(request.getAmenityName(), id)) {
            throw new IllegalArgumentException("Tên tiện ích '" + request.getAmenityName() + "' đã được sử dụng bởi bản ghi khác!");
        }

        existing.setAmenityName(request.getAmenityName());
        existing.setIconUrl(request.getIconUrl());
        existing.setType(request.getType());

        return amenityMapper.toAmenityResponse(amenityRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteAmenity(Long id) {

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được xoá tiện ích!");
        }

        Amenity existing = amenityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tiện ích với ID = " + id));

        amenityRepository.delete(existing);
    }
}