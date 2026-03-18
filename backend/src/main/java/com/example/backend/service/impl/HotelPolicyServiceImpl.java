package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelPolicyServiceImpl implements HotelPolicyService {
    private final HotelPolicyRepository hotelPolicyRepository;
    private final HotelRepository hotelRepository;
    private final HotelPolicyMapper hotelPolicyMapper;

    @Override
    @Transactional(readOnly = true)
    public List<HotelPolicyResponse> getAllHotelPolicys() {

        if (isAdmin()) {
            return hotelPolicyRepository.findAll()
                    .stream()
                    .map(hotelPolicyMapper::toHotelPolicyResponse)
                    .toList();
        }

        String email = getCurrentUserEmail();

        return hotelPolicyRepository.findByHotel_Owner_Email(email)
                .stream()
                .map(hotelPolicyMapper::toHotelPolicyResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public HotelPolicyResponse getHotelPolicyById(Long id) {
        return hotelPolicyRepository.findById(id)
                .map(hotelPolicyMapper::toHotelPolicyResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "HotelPolicy not found id=" + id));
    }

    @Override
    @Transactional
    public HotelPolicyResponse createHotelPolicy(HotelPolicyRequest request) {

        if (!isAdmin() && !isHotelOwner()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền tạo chính sách!");
        }

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Hotel not found id=" + request.getHotelId()));

        if (!isAdmin()) {
            checkOwnerOrAdmin(hotel.getOwner().getEmail());
        }

        if (hotelPolicyRepository.existsByHotel_Id(request.getHotelId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Khách sạn đã có chính sách rồi!");
        }

        HotelPolicy saved = hotelPolicyRepository.save(
                hotelPolicyMapper.toHotelPolicy(request, hotel));

        return hotelPolicyMapper.toHotelPolicyResponse(saved);
    }

    @Override
    @Transactional
    public HotelPolicyResponse updateHotelPolicy(Long id, HotelPolicyRequest request) {

        HotelPolicy existing = hotelPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "HotelPolicy not found id=" + id));

        if (!isAdmin()) {
            checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());
        }

        if (request.getHotelId() != null) {
            Hotel hotel = hotelRepository.findById(request.getHotelId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Hotel not found id=" + request.getHotelId()));

            if (!hotel.getId().equals(existing.getHotel().getId()) &&
                    hotelPolicyRepository.existsByHotel_Id(request.getHotelId())) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Khách sạn này đã có chính sách!");
            }

            existing.setHotel(hotel);
        }

        if (request.getCheckInTime() != null)
            existing.setCheckInTime(request.getCheckInTime());
        if (request.getCheckOutTime() != null)
            existing.setCheckOutTime(request.getCheckOutTime());
        if (request.getCancellationPolicy() != null)
            existing.setCancellationPolicy(request.getCancellationPolicy());
        if (request.getChildrenPolicy() != null)
            existing.setChildrenPolicy(request.getChildrenPolicy());
        if (request.getPetPolicy() != null)
            existing.setPetPolicy(request.getPetPolicy());

        return hotelPolicyMapper.toHotelPolicyResponse(
                hotelPolicyRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteHotelPolicy(Long id) {

        HotelPolicy existing = hotelPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "HotelPolicy not found id=" + id));

        if (!isAdmin()) {
            checkOwnerOrAdmin(existing.getHotel().getOwner().getEmail());
        }

        hotelPolicyRepository.delete(existing);
    }
}