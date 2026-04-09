package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewReportRequest {
    @NotBlank(message = "Vui lòng nhập lý do báo cáo để Admin xem xét")
    private String reason;
}