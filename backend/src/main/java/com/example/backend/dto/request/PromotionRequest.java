package com.example.backend.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.validation.constraints.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionRequest {

    private Long hotelId;

    @NotBlank(message = "Mã giảm giá không được để trống")
    @Size(min = 3, max = 20, message = "Mã giảm giá phải từ 3 đến 20 ký tự")
    @Pattern(regexp = "^[A-Z0-9]+$", message = "Mã giảm giá chỉ gồm chữ in hoa và số")
    private String promoCode;

    @DecimalMin(value = "0.0", message = "Phần trăm giảm giá không được nhỏ hơn 0")
    @DecimalMax(value = "100.0", message = "Phần trăm giảm giá không được vượt quá 100")
    private BigDecimal discountPercent;

    @NotNull(message = "Số tiền giảm tối đa không được để trống")
    @DecimalMin(value = "0.0", message = "Số tiền giảm tối đa không được âm")
    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDateTime startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDateTime endDate;

    @DecimalMin(value = "0.0", message = "Giá trị đơn hàng tối thiểu không được âm")
    private BigDecimal minOrderValue;

    private Boolean isActive;
}