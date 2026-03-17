package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelImageRequest;
import com.example.backend.dto.response.HotelImageResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelImage;
import com.example.backend.mapper.HotelImageMapper;
import com.example.backend.repository.HotelImageRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.service.HotelImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelImageServiceImpl implements HotelImageService {
    private final HotelImageRepository hotelImageRepository;
    private final HotelRepository hotelRepository;
    private final HotelImageMapper hotelImageMapper;

    @Override
    public List<HotelImageResponse> getAllHotelImages() {
        return hotelImageRepository.findAll().stream()
                .map(hotelImageMapper::toHotelImageResponse)
                .collect(Collectors.toList());
    }

    @Override
    public HotelImageResponse getHotelImageById(Long id) {
        return hotelImageRepository.findById(id)
                .map(hotelImageMapper::toHotelImageResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelImage not found id=" + id));
    }

    @Override
    public HotelImageResponse createHotelImage(HotelImageRequest request) {
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found id=" + request.getHotelId()));
        
        HotelImage saved = hotelImageRepository.save(hotelImageMapper.toHotelImage(request, hotel));
        return hotelImageMapper.toHotelImageResponse(saved);
    }

    @Override
    public HotelImageResponse updateHotelImage(Long id, HotelImageRequest request) {
        HotelImage existing = hotelImageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelImage not found id=" + id));

        if (request.getHotelId() != null) {
            Hotel hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found id=" + request.getHotelId()));
            existing.setHotel(hotel);
        }
        
        if (request.getImageUrl() != null) existing.setImageUrl(request.getImageUrl());
        if (request.getIsPrimary() != null) existing.setIsPrimary(request.getIsPrimary());

        return hotelImageMapper.toHotelImageResponse(hotelImageRepository.save(existing));
    }

    @Override
    public void deleteHotelImage(Long id) {
        HotelImage existing = hotelImageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelImage not found id=" + id));
        hotelImageRepository.delete(existing);
    }
}