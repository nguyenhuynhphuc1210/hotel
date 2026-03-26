package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.entity.Hotel;
import jakarta.persistence.EntityNotFoundException;
import com.example.backend.mapper.HotelStatisticMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.HotelStatisticRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.HotelStatisticService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelStatisticServiceImpl implements HotelStatisticService {

    private final HotelStatisticRepository statisticRepository;
    private final HotelRepository hotelRepository;
    private final HotelStatisticMapper mapper;

    @Override
    public List<HotelStatisticResponse> getStatistics(HotelStatisticRequest request) {
        
        Long hotelId = request.getHotelId();
        LocalDate fromDate = request.getFromDate();
        LocalDate toDate = request.getToDate();

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        if (SecurityUtils.isHotelOwner()) {
            if (!hotel.getOwner().getEmail().equals(SecurityUtils.getCurrentUserEmail())) {
                throw new IllegalArgumentException("Không có quyền xem doanh thu khách sạn này!");
            }
        } else if (!SecurityUtils.isAdmin()) {
            throw new IllegalArgumentException("Khách hàng không được truy cập trang này!");
        }

        if (fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
        }

        return statisticRepository.findByHotelIdAndStatDateBetweenOrderByStatDateAsc(hotelId, fromDate, toDate)
                .stream()
                .map(mapper::toHotelStatisticResponse)
                .collect(Collectors.toList());
    }
}