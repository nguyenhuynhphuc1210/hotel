package com.example.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingRoomRateRequest {

    @NotNull(message = "Booking Room ID không được để trống")
    private Long bookingRoomId;

    @NotNull(message = "Ngày không được để trống")
    private LocalDate date;

    @NotNull(message = "Giá tại thời điểm đặt không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá phòng phải lớn hơn 0")
    private BigDecimal price;
}