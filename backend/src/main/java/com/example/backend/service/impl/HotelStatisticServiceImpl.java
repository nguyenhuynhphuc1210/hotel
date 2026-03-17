package com.example.backend.service.impl;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelStatistic;
import com.example.backend.mapper.HotelStatisticMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.HotelStatisticRepository;
import com.example.backend.service.HotelStatisticService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelStatisticServiceImpl implements HotelStatisticService {

    private final HotelStatisticRepository hotelStatisticRepository;
    private final HotelRepository hotelRepository;
    private final HotelStatisticMapper hotelStatisticMapper;

    @Override
    public List<HotelStatisticResponse> getHotelStatistics(HotelStatisticRequest request) {

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Hotel not found id=" + request.getHotelId()
                ));

        List<HotelStatistic> stats;

        if (request.getFromDate() != null && request.getToDate() != null) {
            stats = hotelStatisticRepository.findByHotelAndStatDateBetween(
                    hotel,
                    request.getFromDate(),
                    request.getToDate()
            );
        } else {
            stats = hotelStatisticRepository.findByHotel(hotel);
        }

        return stats.stream()
                .map(hotelStatisticMapper::toHotelStatisticResponse)
                .toList();
    }

    @Override
    public HotelStatisticResponse getHotelStatisticById(Long id) {
        HotelStatistic stat = hotelStatisticRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "HotelStatistic not found id=" + id
                ));

        return hotelStatisticMapper.toHotelStatisticResponse(stat);
    }

    @Override
    public void deleteHotelStatistic(Long id) {
        HotelStatistic stat = hotelStatisticRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "HotelStatistic not found id=" + id
                ));

        hotelStatisticRepository.delete(stat);
    }
}