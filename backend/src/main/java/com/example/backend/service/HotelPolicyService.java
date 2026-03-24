package com.example.backend.service;

import com.example.backend.dto.request.HotelPolicyRequest;
import com.example.backend.dto.response.HotelPolicyResponse;

import java.util.List;

public interface HotelPolicyService {
    List<HotelPolicyResponse> getAllHotelPolicys();
    HotelPolicyResponse getHotelPolicyById(Long id);
    HotelPolicyResponse getPolicyByHotelId(Long hotelId);
    HotelPolicyResponse createHotelPolicy(HotelPolicyRequest request);
    HotelPolicyResponse updateHotelPolicy(Long id, HotelPolicyRequest request);
    void deleteHotelPolicy(Long id);
}