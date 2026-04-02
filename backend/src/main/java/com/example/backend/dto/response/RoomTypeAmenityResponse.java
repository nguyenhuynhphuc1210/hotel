package com.example.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeAmenityResponse {

    private Long roomTypeId;
    private String roomTypeName;
    private Long amenityId;
    private String amenityName; 
    private String iconUrl;     
    private Boolean isFree;
    private BigDecimal additionalFee;
}