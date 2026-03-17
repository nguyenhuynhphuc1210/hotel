package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelPolicyRequest;
import com.example.backend.dto.response.HotelPolicyResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelPolicy;
import com.example.backend.mapper.HotelPolicyMapper;
import com.example.backend.repository.HotelPolicyRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.service.HotelPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelPolicyServiceImpl implements HotelPolicyService {
    private final HotelPolicyRepository hotelPolicyRepository;
    private final HotelRepository hotelRepository;
    private final HotelPolicyMapper hotelPolicyMapper;

    @Override
    public List<HotelPolicyResponse> getAllHotelPolicys() {
        return hotelPolicyRepository.findAll().stream().map(hotelPolicyMapper::toHotelPolicyResponse).collect(Collectors.toList());
    }

    @Override
    public HotelPolicyResponse getHotelPolicyById(Long id) {
        return hotelPolicyRepository.findById(id)
                .map(hotelPolicyMapper::toHotelPolicyResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelPolicy not found id=" + id));
    }

    @Override
    public HotelPolicyResponse createHotelPolicy(HotelPolicyRequest request) {
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found id=" + request.getHotelId()));
        HotelPolicy saved = hotelPolicyRepository.save(hotelPolicyMapper.toHotelPolicy(request, hotel));
        return hotelPolicyMapper.toHotelPolicyResponse(saved);
    }

    @Override
    public HotelPolicyResponse updateHotelPolicy(Long id, HotelPolicyRequest request) {
        HotelPolicy existing = hotelPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelPolicy not found id=" + id));

        if (request.getHotelId() != null) {
            Hotel hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hotel not found id=" + request.getHotelId()));
            existing.setHotel(hotel);
        }
        if (request.getCheckInTime() != null) existing.setCheckInTime(request.getCheckInTime());
        if (request.getCheckOutTime() != null) existing.setCheckOutTime(request.getCheckOutTime());
        if (request.getCancellationPolicy() != null) existing.setCancellationPolicy(request.getCancellationPolicy());
        if (request.getChildrenPolicy() != null) existing.setChildrenPolicy(request.getChildrenPolicy());
        if (request.getPetPolicy() != null) existing.setPetPolicy(request.getPetPolicy());

        return hotelPolicyMapper.toHotelPolicyResponse(hotelPolicyRepository.save(existing));
    }

    @Override
    public void deleteHotelPolicy(Long id) {
        HotelPolicy existing = hotelPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelPolicy not found id=" + id));
        hotelPolicyRepository.delete(existing);
    }
}