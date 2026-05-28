package com.example.backend.dto.request;

import lombok.Data;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateCalendarRequest {
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;

    @NotNull(message = "Giá phòng không được để trống")
    @Min(value = 0, message = "Giá phòng phải >= 0")
    private BigDecimal price;

    @NotNull(message = "Tổng số phòng không được để trống")
    @Min(value = 0, message = "Số lượng phòng không được âm")
    private Integer totalRooms;

    private Boolean isAvailable;
}