package com.example.backend.service;

import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.HotelStatisticResponse;

import java.util.List;

public interface HotelStatisticService {
    List<HotelStatisticResponse> getStatistics(HotelStatisticRequest request);

}