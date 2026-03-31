package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelAdminResponse;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.dto.response.HotelSummaryResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.entity.RoomType;
import com.example.backend.entity.User;
import com.example.backend.mapper.HotelMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.HotelService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {
    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final HotelMapper hotelMapper;
    private final RoomCalendarRepository roomCalendarRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<HotelSummaryResponse> getActiveHotels() {
        return hotelRepository.findByIsActiveTrue()
                .stream()
                .map(hotelMapper::toHotelSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelAdminResponse> getAllHotels() {
        List<Hotel> hotels;

        if (isAdmin()) {
            hotels = hotelRepository.findAll();
        } else if (isHotelOwner()) {
            hotels = hotelRepository.findByOwnerEmail(getCurrentUserEmail());
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập trang quản trị");
        }

        return hotels.stream()
                .map(hotelMapper::toHotelAdminResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public HotelResponse getHotelById(Long id) {
        return hotelRepository.findById(id)
                .map(hotelMapper::toHotelResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));
    }

    @Override
    @Transactional
    public HotelResponse createHotel(HotelRequest request) {

        if (hotelRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email khách sạn đã tồn tại!");
        }

        String currentEmail = getCurrentUserEmail();
        User owner;

        if (isAdmin() && request.getOwnerId() != null) {
            owner = userRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Không tìm thấy chủ sở hữu với ID: " + request.getOwnerId()));

        } else {

            owner = userRepository.findByEmail(currentEmail)
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng hiện tại"));
        }

        Hotel hotel = hotelMapper.toHotel(request, owner);
        hotel.setStarRating(BigDecimal.ZERO);

        hotel.setIsActive(isAdmin());

        return hotelMapper.toHotelResponse(hotelRepository.save(hotel));
    }

    @Override
    @Transactional
    public HotelResponse updateHotel(Long id, HotelRequest request) {

        Hotel existing = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        checkOwnerOrAdmin(existing.getOwner().getEmail());

        if (!existing.getEmail().equalsIgnoreCase(request.getEmail())) {
            if (hotelRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email này đã được đăng ký cho một khách sạn khác!");
            }
        }

        existing.setHotelName(request.getHotelName());
        existing.setDescription(request.getDescription());
        existing.setAddressLine(request.getAddressLine());
        existing.setWard(request.getWard());
        existing.setDistrict(request.getDistrict());
        existing.setCity(request.getCity());
        existing.setPhone(request.getPhone());
        existing.setEmail(request.getEmail());

        if (isAdmin() && request.getOwnerId() != null) {

            if (!existing.getOwner().getId().equals(request.getOwnerId())) {
                User newOwner = userRepository.findById(request.getOwnerId())
                        .orElseThrow(() -> new EntityNotFoundException(
                                "Không tìm thấy tài khoản chủ sở hữu mới với ID: " + request.getOwnerId()));

                existing.setOwner(newOwner);
            }
        }

        return hotelMapper.toHotelResponse(hotelRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteHotel(Long id) {

        Hotel existing = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được xoá khách sạn!");
        }

        hotelRepository.delete(existing);
    }

    @Override
    @Transactional
    public HotelResponse approveHotel(Long id) {

        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được duyệt khách sạn!");
        }

        if (Boolean.TRUE.equals(hotel.getIsActive())) {
            throw new IllegalArgumentException("Khách sạn đã được duyệt trước đó!");
        }

        hotel.setIsActive(true);

        return hotelMapper.toHotelResponse(hotelRepository.save(hotel));
    }

    @Override
    @Transactional
    public HotelResponse disableHotel(Long id) {

        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được vô hiệu hóa khách sạn!");
        }

        if (!Boolean.TRUE.equals(hotel.getIsActive())) {
            throw new IllegalArgumentException("Khách sạn đã bị vô hiệu hóa trước đó");
        }

        hotel.setIsActive(false);

        return hotelMapper.toHotelResponse(hotelRepository.save(hotel));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelSummaryResponse> searchHotels(String district, String keyword,
            LocalDate checkIn, LocalDate checkOut, Integer guests) {

        List<Hotel> hotels = hotelRepository.findByIsActiveTrue();

        return hotels.stream()
                .filter(h -> district == null || district.isBlank() ||
                        h.getDistrict().toLowerCase().contains(district.toLowerCase()))
                .filter(h -> keyword == null || keyword.isBlank() ||
                        h.getHotelName().toLowerCase().contains(keyword.toLowerCase()) ||
                        h.getAddressLine().toLowerCase().contains(keyword.toLowerCase()))
                .filter(h -> {
                    if (checkIn == null || checkOut == null)
                        return true;
                    long days = checkOut.toEpochDay() - checkIn.toEpochDay();
                    long availableDays = roomCalendarRepository.countAvailableByHotelAndDateRange(h.getId(), checkIn,
                            checkOut);
                    return availableDays >= days;
                })
                .map(hotelMapper::toHotelSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getMinPriceForHotel(Long hotelId, LocalDate checkIn, LocalDate checkOut) {
        List<RoomType> roomTypes = roomTypeRepository.findByHotelIdAndIsActiveTrue(hotelId);

        return roomTypes.stream()
                .flatMap(rt -> roomCalendarRepository
                        .findByRoomType_IdAndDateBetween(rt.getId(), checkIn, checkOut)
                        .stream())
                .filter(c -> c.getIsAvailable() && (c.getTotalRooms() - c.getBookedRooms()) > 0)
                .map(RoomCalendar::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(null);
    }
}