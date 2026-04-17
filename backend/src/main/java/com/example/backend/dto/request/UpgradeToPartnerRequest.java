package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpgradeToPartnerRequest {
    @NotBlank(message = "Số điện thoại liên hệ là bắt buộc đối với Đối tác")
    private String phone;

}