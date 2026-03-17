package com.example.backend.service.impl;

import com.example.backend.dto.request.AmenityRequest;
import com.example.backend.dto.response.AmenityResponse;
import com.example.backend.entity.Amenity;
import com.example.backend.mapper.AmenityMapper;
import com.example.backend.repository.AmenityRepository;
import com.example.backend.service.AmenityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AmenityServiceImpl implements AmenityService {
    private final AmenityRepository amenityRepository;
    private final AmenityMapper amenityMapper;

    @Override
    public List<AmenityResponse> getAllAmenities() {
        return amenityRepository.findAll().stream().map(amenityMapper::toAmenityResponse).collect(Collectors.toList());
    }

    @Override
    public AmenityResponse getAmenityById(Long id) {
        return amenityRepository.findById(id)
                .map(amenityMapper::toAmenityResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Amenity not found id=" + id));
    }

    @Override
    public AmenityResponse createAmenity(AmenityRequest request) {
        if (amenityRepository.existsByAmenityName(request.getAmenityName())) {
            throw new RuntimeException("Tên tiện ích '" + request.getAmenityName() + "' đã tồn tại!");
        }
        Amenity saved = amenityRepository.save(amenityMapper.toAmenity(request));
        return amenityMapper.toAmenityResponse(saved);
    }

    @Override
    public AmenityResponse updateAmenity(Long id, AmenityRequest request) {
        Amenity existing = amenityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Amenity not found id=" + id));

        if (amenityRepository.existsByAmenityNameAndIdNot(request.getAmenityName(), id)) {
            throw new RuntimeException(
                    "Tên tiện ích '" + request.getAmenityName() + "' đã được sử dụng bởi một bản ghi khác!");
        }
        existing.setAmenityName(request.getAmenityName());
        existing.setIconUrl(request.getIconUrl());

        return amenityMapper.toAmenityResponse(amenityRepository.save(existing));
    }

    @Override
    public void deleteAmenity(Long id) {
        Amenity existing = amenityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Amenity not found id=" + id));
        amenityRepository.delete(existing);
    }
}
