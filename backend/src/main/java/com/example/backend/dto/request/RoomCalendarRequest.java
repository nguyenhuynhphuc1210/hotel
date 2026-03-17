package com.example.backend.dto.request;

import lombok.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomCalendarRequest {
    @NotNull(message = "Room Type ID không được để trống")
    private Long roomTypeId;

    @NotNull(message = "Ngày không được để trống")
    @FutureOrPresent(message = "Không được thiết lập lịch cho ngày trong quá khứ")
    private LocalDate date;

    @NotNull(message = "Giá phòng không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá phòng phải lớn hơn 0")
    private BigDecimal price;

    @NotNull(message = "Tổng số phòng không được để trống")
    @Min(value = 0, message = "Số lượng phòng không được âm")
    private Integer totalRooms;
    
    private Boolean isAvailable;
}