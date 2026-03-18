package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;
import com.example.backend.dto.request.HotelAmenityRequest;
import com.example.backend.dto.response.HotelAmenityResponse;
import com.example.backend.entity.*;
import com.example.backend.mapper.HotelAmenityMapper;
import com.example.backend.repository.AmenityRepository;
import com.example.backend.repository.HotelAmenityRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.service.HotelAmenityService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelAmenityServiceImpl implements HotelAmenityService {

        private final HotelAmenityRepository hotelAmenityRepository;
        private final HotelRepository hotelRepository;
        private final AmenityRepository amenityRepository;
        private final HotelAmenityMapper mapper;

        @Override
        @Transactional(readOnly = true)
        public List<HotelAmenityResponse> getAll() {

                if (isAdmin()) {
                        return hotelAmenityRepository.findAll()
                                        .stream()
                                        .map(mapper::toHotelAmenityResponse)
                                        .toList();
                }

                String email = getCurrentUserEmail();

                return hotelAmenityRepository.findByHotel_Owner_Email(email)
                                .stream()
                                .map(mapper::toHotelAmenityResponse)
                                .toList();
        }

        @Override
        @Transactional(readOnly = true)
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
        @Transactional
        public HotelAmenityResponse create(HotelAmenityRequest request) {

                if (hotelAmenityRepository.existsByHotel_IdAndAmenity_Id(
                                request.getHotelId(), request.getAmenityId())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Tiện ích đã tồn tại trong khách sạn");
                }

                Hotel hotel = hotelRepository.findById(request.getHotelId())
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy Hotel"));

                if (!isAdmin()) {
                        checkOwnerOrAdmin(hotel.getOwner().getEmail());
                }

                Amenity amenity = amenityRepository.findById(request.getAmenityId())
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy Amenity"));

                HotelAmenity entity = mapper.toHotelAmenity(request, hotel, amenity);

                return mapper.toHotelAmenityResponse(
                                hotelAmenityRepository.save(entity));
        }

        @Override
        @Transactional
        public HotelAmenityResponse update(HotelAmenityRequest request) {

                HotelAmenityId id = new HotelAmenityId(
                                request.getHotelId(),
                                request.getAmenityId());

                HotelAmenity existing = hotelAmenityRepository.findById(id)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy"));

                if (!isAdmin()) {
                        checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());
                }

                existing.setIsFree(request.getIsFree());
                existing.setAdditionalFee(request.getAdditionalFee());

                return mapper.toHotelAmenityResponse(
                                hotelAmenityRepository.save(existing));
        }

        @Override
        @Transactional
        public void delete(Long hotelId, Long amenityId) {

                Hotel hotel = hotelRepository.findById(hotelId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy Hotel"));

                if (!isAdmin()) {
                        checkOwnerOrAdmin(hotel.getOwner().getEmail());
                }

                if (!hotelAmenityRepository.existsByHotel_IdAndAmenity_Id(hotelId, amenityId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Không tìm thấy tiện ích trong khách sạn");
                }

                hotelAmenityRepository.deleteByHotel_IdAndAmenity_Id(hotelId, amenityId);
        }
}