package com.example.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelAmenityRequest {

    @NotNull(message = "ID của khách sạn không được để trống")
    private Long hotelId;

    @NotNull(message = "ID của tiện ích không được để trống")
    private Long amenityId;

    @NotNull(message = "Vui lòng xác định tiện ích này có miễn phí hay không")
    private Boolean isFree;

    @DecimalMin(value = "0.0", message = "Phí phụ thu không được là số âm")
    private BigDecimal additionalFee;
}