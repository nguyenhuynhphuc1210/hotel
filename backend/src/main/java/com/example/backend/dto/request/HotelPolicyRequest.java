package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelPolicyRequest {

    @NotNull(message = "Hotel ID không được để trống")
    private Long hotelId;

    @NotNull(message = "Giờ nhận phòng không được để trống")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    private LocalTime checkInTime;

    @NotNull(message = "Giờ trả phòng không được để trống")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    private LocalTime checkOutTime;

    @NotBlank(message = "Chính sách hủy phòng không được để trống")
    private String cancellationPolicy;

    @NotBlank(message = "Chính sách trẻ em không được để trống")
    private String childrenPolicy;

    @NotBlank(message = "Chính sách thú cưng không được để trống")
    private String petPolicy;
}