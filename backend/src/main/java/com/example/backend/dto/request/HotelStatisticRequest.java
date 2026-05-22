package com.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelStatisticRequest {

    @NotNull(message = "Hotel ID không được để trống")
    private Long hotelId;

    @PastOrPresent(message = "Ngày bắt đầu không được ở tương lai")
    private LocalDate fromDate;

    private LocalDate toDate;

    private Integer day;
    private Integer month;
    private Integer year;
}