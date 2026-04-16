package com.example.backend.enums;

public enum HotelStatus {
    PENDING,    // Chờ duyệt (Mặc định khi Owner tạo)
    APPROVED,   // Đã duyệt / Đang hoạt động (Admin tạo hoặc sau khi duyệt)
    SUSPENDED,  // Tạm ngưng (Chủ khách sạn tự đóng để sửa chữa)
    DISABLED,     // Bị khóa (Admin vô hiệu hóa do vi phạm)
    REJECTED    // Bị từ chối (Admin không duyệt lúc mới tạo)
}
