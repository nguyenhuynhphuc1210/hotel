package com.example.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

import com.example.backend.enums.PaymentMethod;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingRequest {

    @Email(message = "Email không đúng định dạng")
    private String guestEmail;

    private String guestName;

    private String guestPhone;

    @NotNull(message = "Hotel ID không được để trống")
    private Long hotelId;

    @NotNull(message = "Ngày nhận phòng không được để trống")
    @FutureOrPresent(message = "Ngày nhận phòng không được ở quá khứ")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày trả phòng không được để trống")
    @Future(message = "Ngày trả phòng phải ở tương lai")
    private LocalDate checkOutDate;

    private Long promotionId;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    @NotEmpty(message = "Danh sách phòng đặt không được để trống")
    @Valid
    private List<BookingRoomRequest> bookingRooms;
}