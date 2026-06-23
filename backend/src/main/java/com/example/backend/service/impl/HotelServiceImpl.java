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
import com.example.backend.service.NotificationService;

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
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {

    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final HotelMapper hotelMapper;
    private final RoomCalendarRepository roomCalendarRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final NotificationService notificationService;

    @Value("${app.seed.admin.email}")
    private String adminEmail;

    @Override
    @Transactional(readOnly = true)
    public Page<HotelSummaryResponse> getActiveHotels(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return hotelRepository.findByStatusAndDeletedAtIsNull(HotelStatus.APPROVED, pageable)
                .map(hotelMapper::toHotelSummaryResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelAdminResponse> getAllHotels(
            int page,
            int size,
            String keyword,
            HotelStatus status) {

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        String searchKeyword = null;
        if (keyword != null && !keyword.isBlank()) {
            searchKeyword = "%" + keyword.trim().toLowerCase() + "%";
        }

        Page<Hotel> hotelPage;

        if (isAdmin()) {
            hotelPage = hotelRepository.findAdminWithFilter(
                    searchKeyword,
                    status,
                    pageable);

        } else if (isHotelOwner()) {
            hotelPage = hotelRepository.findOwnerWithFilter(
                    getCurrentUserEmail(),
                    searchKeyword,
                    status,
                    pageable);

        } else {
            throw new AccessDeniedException(
                    "Bạn không có quyền truy cập trang quản trị");
        }

        return hotelPage.map(
                hotelMapper::toHotelAdminResponse);
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

        boolean isAdminCreating = isAdmin();
        hotel.setStatus(isAdminCreating ? HotelStatus.APPROVED : HotelStatus.PENDING);

        Hotel savedHotel = hotelRepository.save(hotel);

        if (!isAdminCreating) {
            notificationService.createNotification(
                    adminEmail,
                    "Yêu cầu duyệt khách sạn mới",
                    "Chủ sở hữu " + owner.getEmail() + " vừa thêm khách sạn mới: "
                            + savedHotel.getHotelName() + ". Vui lòng kiểm tra và duyệt yêu cầu.");
        }

        return hotelMapper.toHotelResponse(savedHotel);
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

        roomTypeRepository.updateDeleteAndActiveStatusByHotelId(id, LocalDateTime.now(), false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);

        String ownerEmail = existing.getOwner().getEmail();
        String title = "Khách sạn bị xóa";
        String message = "Khách sạn '" + existing.getHotelName() + "' của bạn đã bị hệ thống xóa.";
        notificationService.createNotification(ownerEmail, title, message);
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
        roomTypeRepository.updateDeleteAndActiveStatusByHotelId(id, null, false);

        Hotel savedHotel = hotelRepository.save(hotel);

        String ownerEmail = savedHotel.getOwner().getEmail();
        String title = "Khách sạn được khôi phục";
        String message = "Khách sạn '" + savedHotel.getHotelName()
                + "' của bạn đã được khôi phục và đang ở trạng thái chờ duyệt.";
        notificationService.createNotification(ownerEmail, title, message);

        return hotelMapper.toHotelResponse(savedHotel);
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

        roomTypeRepository.updateIsActiveByHotelIdSafe(id, true);
        roomCalendarRepository.updateIsAvailableByHotelId(id, true);

        Hotel savedHotel = hotelRepository.save(hotel);

        String ownerEmail = savedHotel.getOwner().getEmail();
        String title = "Khách sạn được phê duyệt";
        String message = "Tuyệt vời! Khách sạn '" + savedHotel.getHotelName()
                + "' của bạn đã được phê duyệt và bắt đầu hoạt động.";
        notificationService.createNotification(ownerEmail, title, message);

        return hotelMapper.toHotelResponse(savedHotel);
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

        roomTypeRepository.updateIsActiveByHotelIdSafe(id, false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);

        Hotel savedHotel = hotelRepository.save(hotel);

        String ownerEmail = savedHotel.getOwner().getEmail();
        String title = "Khách sạn bị vô hiệu hóa";
        String message = "Khách sạn '" + savedHotel.getHotelName() + "' của bạn đã bị vô hiệu hóa. Lý do: "
                + reason.trim();
        notificationService.createNotification(ownerEmail, title, message);

        return hotelMapper.toHotelResponse(savedHotel);
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

        roomTypeRepository.updateIsActiveByHotelIdSafe(id, false);
        roomCalendarRepository.updateIsAvailableByHotelId(id, false);

        Hotel savedHotel = hotelRepository.save(hotel);

        String ownerEmail = savedHotel.getOwner().getEmail();
        String title = "Khách sạn bị từ chối";
        String message = "Yêu cầu đăng ký khách sạn '" + savedHotel.getHotelName() + "' của bạn đã bị từ chối. Lý do: "
                + reason.trim();
        notificationService.createNotification(ownerEmail, title, message);

        return hotelMapper.toHotelResponse(savedHotel);
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

        roomTypeRepository.updateIsActiveByHotelIdSafe(id, false);
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

        roomTypeRepository.updateIsActiveByHotelIdSafe(id, true);
        roomCalendarRepository.updateIsAvailableByHotelId(id, true);

        return hotelMapper.toHotelResponse(hotel);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelSummaryResponse> searchHotels(
            List<String> districts, String keyword,
            LocalDate checkIn, LocalDate checkOut,
            Integer adults, Integer children,
            List<Integer> stars, BigDecimal minPrice, BigDecimal maxPrice,
            List<String> hotelAmenities, List<String> roomAmenities, List<String> bedTypes,
            String sortBy, int page, int size) {

        List<String> searchDistricts = null;
        if (districts != null && !districts.isEmpty()) {
            searchDistricts = districts.stream()
                    .filter(d -> d != null && !d.trim().isEmpty())
                    .map(String::trim)
                    .toList();

            if (searchDistricts.isEmpty()) {
                searchDistricts = null;
            }
        }

        String searchKeyword = null;
        if (keyword != null && !keyword.trim().isEmpty()) {
            searchKeyword = "%" + keyword.trim().toLowerCase() + "%";
        }

        Integer searchAdults = (adults != null && adults > 0) ? adults : 1;
        Integer searchChildren = (children != null && children > 0) ? children : 0;

        List<BigDecimal> searchStars = null;
        if (stars != null && !stars.isEmpty()) {
            searchStars = stars.stream()
                    .map(BigDecimal::valueOf)
                    .toList();
        }

        List<String> searchHotelAmenities = null;
        if (hotelAmenities != null && !hotelAmenities.isEmpty()) {
            searchHotelAmenities = hotelAmenities.stream()
                    .filter(a -> a != null && !a.trim().isEmpty())
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .toList();
            if (searchHotelAmenities.isEmpty()) {
                searchHotelAmenities = null;
            }
        }

        List<String> searchRoomAmenities = null;
        if (roomAmenities != null && !roomAmenities.isEmpty()) {
            searchRoomAmenities = roomAmenities.stream()
                    .filter(a -> a != null && !a.trim().isEmpty())
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .toList();
            if (searchRoomAmenities.isEmpty()) {
                searchRoomAmenities = null;
            }
        }

        List<String> searchBedTypes = null;
        if (bedTypes != null && !bedTypes.isEmpty()) {
            searchBedTypes = bedTypes.stream()
                    .filter(b -> b != null && !b.trim().isEmpty())
                    .map(String::trim)
                    .map(String::toLowerCase)
                    .toList();
            if (searchBedTypes.isEmpty()) {
                searchBedTypes = null;
            }
        }

        if (checkIn != null && checkOut != null) {
            if (!checkIn.isBefore(checkOut)) {
                throw new IllegalArgumentException("Ngày nhận phòng phải diễn ra trước ngày trả phòng.");
            }
        } else {
            checkIn = LocalDate.now();
            checkOut = LocalDate.now().plusDays(1);
        }

        long nights = 1;
        if (checkIn != null && checkOut != null) {
            nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
            if (nights <= 0)
                nights = 1;
        }

        Pageable pageable = PageRequest.of(page, size);

        return hotelRepository.searchHotelsWithFilters(
                searchDistricts,
                searchKeyword,
                checkIn,
                checkOut,
                nights,
                searchAdults,
                searchChildren,
                searchStars,
                minPrice,
                maxPrice,
                searchHotelAmenities,
                searchHotelAmenities != null ? searchHotelAmenities.size() : null,
                searchRoomAmenities,
                searchRoomAmenities != null ? searchRoomAmenities.size() : null,
                searchBedTypes,
                sortBy,
                pageable);
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