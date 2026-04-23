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
import com.example.backend.enums.HotelStatus;
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

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
    public Page<HotelSummaryResponse> getActiveHotels(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return hotelRepository.findByStatusAndDeletedAtIsNull(HotelStatus.APPROVED, pageable)
                .map(hotelMapper::toHotelSummaryResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelAdminResponse> getAllHotels(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Hotel> hotelPage;

        if (isAdmin()) {
            hotelPage = hotelRepository.findByDeletedAtIsNull(pageable);
        } else if (isHotelOwner()) {
            hotelPage = hotelRepository.findByOwner_EmailAndDeletedAtIsNull(getCurrentUserEmail(), pageable);
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập trang quản trị");
        }

        return hotelPage.map(hotelMapper::toHotelAdminResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelAdminResponse> getDeletedHotels(int page, int size) {
        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được xem danh sách khách sạn đã xóa!");
        }

        Pageable pageable = PageRequest.of(page, size);

        return hotelRepository.findByDeletedAtIsNotNull(pageable)
                .map(hotelMapper::toHotelAdminResponse);
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

        hotel.setStatus(isAdmin() ? HotelStatus.APPROVED : HotelStatus.PENDING);

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

        existing.setDeletedAt(LocalDateTime.now());
        hotelRepository.save(existing);

        roomTypeRepository.updateDeletedAtByHotelId(id, LocalDateTime.now());
        roomTypeRepository.updateIsActiveByHotelId(id, false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);
    }

    @Override
    @Transactional
    public HotelResponse restoreHotel(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được khôi phục khách sạn!");
        }

        if (hotel.getDeletedAt() == null) {
            throw new IllegalArgumentException("Khách sạn này chưa bị xóa!");
        }

        hotel.setDeletedAt(null);
        hotel.setStatus(HotelStatus.PENDING);
        hotel.setStatusReason("Khách sạn được khôi phục, chờ duyệt lại");
        roomTypeRepository.updateDeletedAtByHotelId(id, null);

        return hotelMapper.toHotelResponse(hotelRepository.save(hotel));
    }

    @Override
    @Transactional
    public HotelResponse approveHotel(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được duyệt khách sạn!");
        }

        if (hotel.getStatus() == HotelStatus.APPROVED) {
            throw new IllegalArgumentException("Khách sạn này hiện đã ở trạng thái hoạt động rồi!");
        }

        hotel.setStatus(HotelStatus.APPROVED);
        hotel.setStatusReason(null);
        hotelRepository.save(hotel);

        roomTypeRepository.updateIsActiveByHotelId(id, true);
        roomCalendarRepository.updateIsAvailableByHotelId(id, true);

        return hotelMapper.toHotelResponse(hotel);
    }



    @Override
    @Transactional
    public HotelResponse disableHotel(Long id, String reason) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được vô hiệu hóa khách sạn!");
        }

        if (hotel.getStatus() == HotelStatus.DISABLED) {
            throw new IllegalArgumentException("Khách sạn đã bị vô hiệu hóa trước đó");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Bắt buộc phải nhập lý do vô hiệu hóa để Chủ khách sạn biết và khắc phục!");
        }

        hotel.setStatus(HotelStatus.DISABLED);
        hotel.setStatusReason(reason.trim());
        hotelRepository.save(hotel);

        roomTypeRepository.updateIsActiveByHotelId(id, false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);

        return hotelMapper.toHotelResponse(hotel);
    }

    @Override
    @Transactional
    public HotelResponse rejectHotel(Long id, String reason) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        if (!isAdmin()) {
            throw new AccessDeniedException("Chỉ ADMIN mới được từ chối khách sạn!");
        }

        if (hotel.getStatus() != HotelStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể từ chối khách sạn đang ở trạng thái chờ duyệt (PENDING)!");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Bắt buộc phải nhập lý do từ chối để Chủ khách sạn biết và khắc phục!");
        }

        hotel.setStatus(HotelStatus.REJECTED);
        hotel.setStatusReason(reason.trim());
        hotelRepository.save(hotel);

        roomTypeRepository.updateIsActiveByHotelId(id, false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);

        return hotelMapper.toHotelResponse(hotel);
    }

    @Override
    @Transactional
    public HotelResponse suspendHotel(Long id, String reason) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        checkOwnerOrAdmin(hotel.getOwner().getEmail());

        if (hotel.getStatus() != HotelStatus.APPROVED) {
            throw new IllegalArgumentException("Chỉ có thể tạm ngưng khách sạn đang ở trạng thái hoạt động!");
        }

        hotel.setStatus(HotelStatus.SUSPENDED);
        hotel.setStatusReason(reason != null ? reason.trim() : "Chủ khách sạn tạm đóng cửa để sửa chữa/nâng cấp.");
        hotelRepository.save(hotel);

        roomTypeRepository.updateIsActiveByHotelId(id, false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);

        return hotelMapper.toHotelResponse(hotel);
    }

    @Override
    @Transactional
    public HotelResponse reactivateHotel(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + id));

        checkOwnerOrAdmin(hotel.getOwner().getEmail());

        if (hotel.getStatus() != HotelStatus.SUSPENDED) {
            throw new AccessDeniedException("Trạng thái hiện tại không cho phép tự kích hoạt. Vui lòng liên hệ Admin.");
        }

        hotel.setStatus(HotelStatus.APPROVED);
        hotel.setStatusReason(null);
        hotelRepository.save(hotel);

        roomTypeRepository.updateIsActiveByHotelId(id, true);
        roomCalendarRepository.updateIsAvailableByHotelId(id, true);

        return hotelMapper.toHotelResponse(hotel);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelSummaryResponse> searchHotels(String district, String keyword,
            LocalDate checkIn, LocalDate checkOut, Integer guests, int page, int size) {

        String searchDistrict = (district != null && !district.trim().isEmpty()) ? district.trim() : null;
        String searchKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        Integer searchGuests = (guests != null && guests > 0) ? guests : 1;

        Long nights = 0L;
        if (checkIn != null && checkOut != null) {
            if (!checkIn.isBefore(checkOut)) {
                throw new IllegalArgumentException("Ngày nhận phòng phải diễn ra trước ngày trả phòng.");
            }

            nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        }

        Pageable pageable = PageRequest.of(page, size);

        Page<Hotel> hotelPage = hotelRepository.searchHotels(
                searchDistrict,
                searchKeyword,
                checkIn,
                checkOut,
                nights,
                searchGuests, 
                pageable);

        return hotelPage.map(hotelMapper::toHotelSummaryResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getMinPriceForHotel(Long hotelId, LocalDate checkIn, LocalDate checkOut) {
        List<RoomType> roomTypes = roomTypeRepository.findActiveRoomTypesByHotel(hotelId);

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