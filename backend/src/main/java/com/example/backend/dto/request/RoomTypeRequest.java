package com.example.backend.dto.request;

import lombok.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeRequest {
    @NotNull(message = "Hotel ID không được để trống")
    private Long hotelId;

    @NotBlank(message = "Tên loại phòng không được để trống")
    private String typeName;

    private String description;

    @NotNull(message = "Số người lớn tối đa không được để trống")
    @Min(value = 1, message = "Phòng phải chứa được ít nhất 1 người lớn")
    private Integer maxAdults;

    @Min(value = 0, message = "Số trẻ em không được là số âm")
    private Integer maxChildren;

    @NotBlank(message = "Loại giường không được để trống")
    private String bedType;

    @Positive(message = "Diện tích phòng phải là số dương")
    private Double roomSize;

    @NotNull(message = "Giá phòng không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá phòng phải lớn hơn 0")
    private BigDecimal basePrice;

    @NotNull(message = "Tổng số phòng không được để trống")
    @Min(value = 1, message = "Tổng số phòng vật lý phải lớn hơn hoặc bằng 1")
    private Integer totalRooms;
}