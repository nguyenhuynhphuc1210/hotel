package com.example.backend.dto.request;

import com.example.backend.enums.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateBookingStatusRequest {
    @NotNull(message = "Trạng thái không được để trống")
    private BookingStatus status;
}