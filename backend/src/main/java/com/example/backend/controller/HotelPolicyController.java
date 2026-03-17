package com.example.backend.controller;

import com.example.backend.dto.request.HotelPolicyRequest;
import com.example.backend.dto.response.HotelPolicyResponse;
import com.example.backend.service.HotelPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/hotel-policies")
@RequiredArgsConstructor
public class HotelPolicyController {

    private final HotelPolicyService hotelPolicyService;

    @GetMapping
    public ResponseEntity<List<HotelPolicyResponse>> getAll() {
        return ResponseEntity.ok(hotelPolicyService.getAllHotelPolicys());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HotelPolicyResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(hotelPolicyService.getHotelPolicyById(id));
    }

    @PostMapping
    public ResponseEntity<HotelPolicyResponse> create( @Valid @RequestBody HotelPolicyRequest request) {
        HotelPolicyResponse created = hotelPolicyService.createHotelPolicy(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HotelPolicyResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody HotelPolicyRequest request
    ) {
        return ResponseEntity.ok(hotelPolicyService.updateHotelPolicy(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        hotelPolicyService.deleteHotelPolicy(id);
        return ResponseEntity.noContent().build();
    }
}