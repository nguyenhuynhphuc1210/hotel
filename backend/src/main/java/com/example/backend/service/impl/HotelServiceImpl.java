package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelRequest;
import com.example.backend.dto.response.HotelResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import com.example.backend.mapper.HotelMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.HotelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {
    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final HotelMapper hotelMapper;

    @Override
    public List<HotelResponse> getAllHotels() {
        return hotelRepository.findAll().stream().map(hotelMapper::toHotelResponse).collect(Collectors.toList());
    }

    @Override
    public HotelResponse getHotelById(Long id) {
        return hotelRepository.findById(id)
                .map(hotelMapper::toHotelResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotel not found id=" + id));
    }

    @Override
    @Transactional
    public HotelResponse createHotel(HotelRequest request) {

        if (hotelRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email khách sạn đã tồn tại!");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn chưa đăng nhập");
        }

        String currentUsername = authentication.getName();

        User owner;
        if (request.getOwnerId() != null) {
            owner = userRepository.findById(request.getOwnerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy User với ID: " + request.getOwnerId()));
        } else {
            owner = userRepository.findByEmail(currentUsername)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy tài khoản người dùng hiện tại"));
        }

        Hotel hotel = hotelMapper.toHotel(request, owner);
        hotel.setStarRating(BigDecimal.ZERO);

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(r -> r.getAuthority().equals("ROLE_ADMIN"));

        hotel.setIsActive(isAdmin);

        return hotelMapper.toHotelResponse(hotelRepository.save(hotel));
    }

    @Override
    @Transactional
    public HotelResponse updateHotel(Long id, HotelRequest request) {
        Hotel existing = hotelRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotel not found id=" + id));

        // Lấy thông tin người dùng đang đăng nhập
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(r -> r.getAuthority().equals("ROLE_ADMIN"));
        String currentEmail = auth.getName();

        // KIỂM TRA QUYỀN SỞ HỮU: Nếu không phải Admin, phải là chủ của khách sạn này
        // mới được sửa
        if (!isAdmin && !existing.getOwner().getEmail().equals(currentEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa khách sạn này!");
        }

        // 1. Kiểm tra Email duy nhất (Trừ chính nó)
        if (!existing.getEmail().equalsIgnoreCase(request.getEmail())) {
            if (hotelRepository.existsByEmail(request.getEmail())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng!");
            }
        }

        // 2. Cập nhật các trường thông tin chung
        existing.setHotelName(request.getHotelName());
        existing.setDescription(request.getDescription());
        existing.setAddressLine(request.getAddressLine());
        existing.setWard(request.getWard());
        existing.setDistrict(request.getDistrict());
        existing.setCity(request.getCity());
        existing.setPhone(request.getPhone());
        existing.setEmail(request.getEmail());

        // 3. CHỈ ADMIN MỚI ĐƯỢC PHÉP CẬP NHẬT TRẠNG THÁI VÀ CHỦ SỞ HỮU
        if (isAdmin) {
            if (request.getIsActive() != null) {
                existing.setIsActive(request.getIsActive());
            }
            if (request.getOwnerId() != null) {
                User owner = userRepository.findById(request.getOwnerId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found"));
                existing.setOwner(owner);
            }
        } else {
            // Nếu là Owner sửa, hãy cân nhắc việc set isActive = false để Admin duyệt lại
            // (tùy vào yêu cầu nghiệp vụ của bạn)
            // existing.setIsActive(false);
        }

        return hotelMapper.toHotelResponse(hotelRepository.save(existing));
    }

    @Override
    public void deleteHotel(Long id) {
        Hotel existing = hotelRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotel not found id=" + id));
        hotelRepository.delete(existing);
    }
}
