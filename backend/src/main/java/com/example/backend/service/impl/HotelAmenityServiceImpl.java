package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelAmenityRequest;
import com.example.backend.dto.response.HotelAmenityResponse;
import com.example.backend.entity.*;
import com.example.backend.mapper.HotelAmenityMapper;
import com.example.backend.repository.AmenityRepository;
import com.example.backend.repository.HotelAmenityRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.service.HotelAmenityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelAmenityServiceImpl implements HotelAmenityService {

    private final HotelAmenityRepository hotelAmenityRepository;
    private final HotelRepository hotelRepository;
    private final AmenityRepository amenityRepository;
    private final HotelAmenityMapper mapper;

    @Override
    public HotelAmenityResponse create(HotelAmenityRequest request) {

        if (hotelAmenityRepository.existsByHotel_IdAndAmenity_Id(
                request.getHotelId(), request.getAmenityId())) {
            throw new RuntimeException("HotelAmenity đã tồn tại");
        }

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Hotel"));

        Amenity amenity = amenityRepository.findById(request.getAmenityId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Amenity"));

        HotelAmenity entity = mapper.toHotelAmenity(request, hotel, amenity);

        return mapper.toHotelAmenityResponse(
                hotelAmenityRepository.save(entity)
        );
    }

    @Override
    public List<HotelAmenityResponse> getAll() {
        return hotelAmenityRepository.findAll()
                .stream()
                .map(mapper::toHotelAmenityResponse)
                .toList();
    }

    @Override
    public HotelAmenityResponse getById(Long hotelId, Long amenityId) {

        HotelAmenityId id = new HotelAmenityId(hotelId, amenityId);

        HotelAmenity entity = hotelAmenityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy"));

        return mapper.toHotelAmenityResponse(entity);
    }

    @Override
    public List<HotelAmenityResponse> getByHotel(Long hotelId) {
        return hotelAmenityRepository.findByHotel_Id(hotelId)
                .stream()
                .map(mapper::toHotelAmenityResponse)
                .toList();
    }

    @Override
    public HotelAmenityResponse update(HotelAmenityRequest request) {

        HotelAmenityId id = new HotelAmenityId(
                request.getHotelId(),
                request.getAmenityId()
        );

        HotelAmenity existing = hotelAmenityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy"));

        existing.setIsFree(request.getIsFree());
        existing.setAdditionalFee(request.getAdditionalFee());

        return mapper.toHotelAmenityResponse(
                hotelAmenityRepository.save(existing)
        );
    }

    @Override
    public void delete(Long hotelId, Long amenityId) {
        hotelAmenityRepository.deleteByHotel_IdAndAmenity_Id(hotelId, amenityId);
    }
}