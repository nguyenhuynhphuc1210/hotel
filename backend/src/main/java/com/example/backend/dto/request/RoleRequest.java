package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleRequest {

    @NotBlank(message = "Tên quyền không được để trống")
    @Size(min = 2, max = 50, message = "Tên quyền phải từ 2 đến 50 ký tự")
    @Pattern(regexp = "^[A-Z0-9_]*$", message = "Tên quyền chỉ được chứa chữ hoa, số và dấu gạch dưới")
    private String roleName;
}