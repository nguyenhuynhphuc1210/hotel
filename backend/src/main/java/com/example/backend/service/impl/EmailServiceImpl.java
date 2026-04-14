package com.example.backend.service.impl;

import com.example.backend.entity.Booking;
import com.example.backend.entity.BookingRoom;
import com.example.backend.enums.PaymentMethod;
import com.example.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Override
    @Async
    public void sendOtpEmail(String to, String otp) {
        // ... (Giữ nguyên code hàm sendOtpEmail cũ của bạn)
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("nguyenhuynhphuc1210@gmail.com", "Vago");
            helper.setTo(to);
            helper.setSubject("Mã OTP khôi phục mật khẩu");
            String htmlMsg = "<p>Chào bạn,</p>"
                    + "<p>Mã OTP để khôi phục mật khẩu của bạn là: <strong>" + otp + "</strong></p>"
                    + "<p>Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>";
            helper.setText(htmlMsg, true);
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new RuntimeException("Lỗi khi gửi email xác thực: " + e.getMessage());
        }
    }

    @Override
    @Async
    public void sendBookingConfirmationEmail(Booking booking) {
        String to = booking.getUser() != null ? booking.getUser().getEmail() : booking.getGuestEmail();
        String customerName = booking.getUser() != null ? booking.getUser().getFullName() : booking.getGuestName();
        String subject = "Vago - Đơn đặt của quý khách hiện đã được xác nhận! (" + booking.getBookingCode() + ")";

        // Format lại ngày tháng
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String checkIn = booking.getCheckInDate().format(formatter);
        String checkOut = booking.getCheckOutDate().format(formatter);
        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());

        // Lấy thông tin phòng và TẠO BẢNG CHI TIẾT GIÁ TỪNG ĐÊM
        StringBuilder roomDetails = new StringBuilder();
        StringBuilder priceBreakdown = new StringBuilder();
        int totalRooms = 0;

        for (BookingRoom br : booking.getBookingRooms()) {
            totalRooms += br.getQuantity();
            roomDetails.append(br.getQuantity()).append(" x ").append(br.getRoomType().getTypeName()).append("<br>");

            // Render tiêu đề loại phòng trong bảng thanh toán
            priceBreakdown.append(
                    "<tr><td colspan='2' style='color: #334155; font-weight: bold; padding-top: 10px; padding-bottom: 5px;'>")
                    .append(br.getQuantity()).append(" x ").append(br.getRoomType().getTypeName())
                    .append("</td></tr>");

            // Render chi tiết từng đêm (Lấy từ BookingRoomRate)
            if (br.getRates() != null && !br.getRates().isEmpty()) {
                for (com.example.backend.entity.BookingRoomRate rate : br.getRates()) {
                    java.math.BigDecimal nightTotal = rate.getPrice()
                            .multiply(java.math.BigDecimal.valueOf(br.getQuantity()));

                    priceBreakdown.append(
                            "<tr><td style='color: #64748b; font-size: 13px; padding-left: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;'>")
                            .append("- Đêm ").append(rate.getDate().format(formatter));

                    // Nếu đặt > 1 phòng, hiển thị phép nhân cho rõ ràng
                    if (br.getQuantity() > 1) {
                        priceBreakdown.append(" <span style='font-size: 11px;'>(₫ ")
                                .append(String.format("%,.0f", rate.getPrice()))
                                .append(" x ").append(br.getQuantity()).append(" phòng)</span>");
                    }

                    priceBreakdown.append(
                            "</td><td align='right' style='color: #64748b; font-size: 13px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;'>")
                            .append(String.format("%,.0f", nightTotal)).append(" ₫</td></tr>");
                }
            }
        }

        // Thông tin địa chỉ khách sạn
        String address = booking.getHotel().getAddressLine() + ", " + booking.getHotel().getWard() + ", "
                + booking.getHotel().getDistrict() + ", " + booking.getHotel().getCity();

        String paymentMethodText = booking.getPayment().getPaymentMethod() == PaymentMethod.CASH
                ? "Thanh toán tại khách sạn khi nhận phòng"
                : "Đã thanh toán trực tuyến (" + booking.getPayment().getPaymentMethod().name() + ")";

        // 🔥 PHÂN LUỒNG LINK QUẢN LÝ (Có tài khoản vs Khách vãng lai)
        String manageLink = booking.getUser() != null
                ? "http://localhost:3000/booking/detail/" + booking.getId()
                : "http://localhost:3000/booking/lookup?code=" + booking.getBookingCode();

        // Xây dựng HTML
        String htmlMsg = "<div style='background-color: #f2f5f8; padding: 30px 10px; font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.5;'>"
                + "<div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;'>"

                // Khối 1: Header
                + "<div style='border-top: 4px solid #10b981; padding: 30px 20px; text-align: center;'>"
                + "<h2 style='color: #10b981; margin-top: 0; font-size: 22px;'>Đơn đặt của quý khách hiện đã được xác nhận!</h2>"
                + "<p style='font-size: 15px;'>Thân gửi <strong>" + customerName + "</strong>,</p>"
                + "<p style='font-size: 14px; color: #555;'>Để tham khảo, mã đặt chỗ của quý khách là <strong>"
                + booking.getBookingCode()
                + "</strong>. Để xem, hủy, hoặc sửa đổi đơn đặt chỗ, hãy sử dụng dịch vụ tự phục vụ dễ dàng của chúng tôi.</p>"
                + "<a href='" + manageLink
                + "' style='display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 20px; font-weight: bold; font-size: 14px;'>Quản lý đặt chỗ của tôi</a>"
                + "</div>"

                // Khối 2: Thông tin Khách sạn
                + "<div style='background-color: #f8fafc; padding: 20px; border-top: 1px solid #e0e0e0;'>"
                + "<h3 style='margin: 0 0 10px 0; font-size: 18px; color: #1e293b;'>"
                + booking.getHotel().getHotelName() + "</h3>"
                + "<p style='margin: 0 0 20px 0; font-size: 13px; color: #64748b;'>" + address + "</p>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='text-align: center; border-top: 1px solid #cbd5e1; padding-top: 15px;'>"
                + "<tr><td width='50%' style='border-right: 1px solid #cbd5e1;'>"
                + "<p style='margin: 0; font-size: 13px; color: #64748b;'>Nhận phòng</p>"
                + "<p style='margin: 5px 0; font-size: 16px; font-weight: bold;'>" + checkIn + "</p>"
                + "<p style='margin: 0; font-size: 12px; color: #64748b;'>(sau 14:00)</p></td>"
                + "<td width='50%'><p style='margin: 0; font-size: 13px; color: #64748b;'>Trả phòng</p>"
                + "<p style='margin: 5px 0; font-size: 16px; font-weight: bold;'>" + checkOut + "</p>"
                + "<p style='margin: 0; font-size: 12px; color: #64748b;'>(trước 12:00)</p></td></tr></table></div>"

                // Khối 3: Thông tin Đơn đặt phòng
                + "<div style='padding: 20px; border-top: 1px solid #e0e0e0;'>"
                + "<h4 style='margin: 0 0 15px 0; font-size: 16px; color: #1e293b;'>Thông tin về Đơn đặt phòng</h4>"
                + "<table width='100%' cellpadding='8' cellspacing='0' style='font-size: 14px; color: #334155;'>"
                + "<tr><td width='35%' style='border-bottom: 1px dashed #e2e8f0;'><strong>Đặt phòng:</strong></td><td style='border-bottom: 1px dashed #e2e8f0;'>"
                + totalRooms + " phòng, " + nights + " đêm</td></tr>"
                + "<tr><td style='border-bottom: 1px dashed #e2e8f0;'><strong>Loại phòng:</strong></td><td style='border-bottom: 1px dashed #e2e8f0;'>"
                + roomDetails.toString() + "</td></tr>"
                + "<tr><td style='border-bottom: 1px dashed #e2e8f0;'><strong>Khách chính:</strong></td><td style='border-bottom: 1px dashed #e2e8f0;'>"
                + customerName + "</td></tr></table></div>"

                // Khối 4: Chi tiết thanh toán (TÍCH HỢP BIẾN priceBreakdown VÀO ĐÂY)
                + "<div style='padding: 20px; border-top: 1px solid #e0e0e0; background-color: #f8fafc;'>"
                + "<h4 style='margin: 0 0 15px 0; font-size: 16px; color: #1e293b;'>Thông tin chi tiết thanh toán</h4>"
                + "<table width='100%' cellpadding='5' cellspacing='0' style='font-size: 14px;'>"

                + priceBreakdown.toString() // <--- Render chi tiết các đêm ra đây

                + "<tr><td style='color: #334155; padding-top: 15px;'>Tạm tính</td><td align='right' style='color: #334155; padding-top: 15px;'>"
                + String.format("%,.0f", booking.getSubtotal()) + " ₫</td></tr>";

        // Hiện dòng giảm giá nếu có promotion
        if (booking.getDiscountAmount() != null && booking.getDiscountAmount().doubleValue() > 0) {
            htmlMsg += "<tr><td style='color: #10b981;'>Giảm giá</td><td align='right' style='color: #10b981;'>- "
                    + String.format("%,.0f", booking.getDiscountAmount()) + " ₫</td></tr>";
        }

        htmlMsg += "<tr><td colspan='2'><hr style='border: 0; border-top: 1px solid #cbd5e1; margin: 10px 0;'></td></tr>"
                + "<tr><td><strong style='font-size: 16px;'>Tổng tiền</strong></td><td align='right'><strong style='font-size: 18px; color: #ef4444;'>"
                + String.format("%,.0f", booking.getTotalAmount()) + " ₫</strong></td></tr></table>"
                + "<p style='margin: 15px 0 0 0; font-size: 13px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 15px;'>"
                + paymentMethodText + "</p></div>"
                + "</div><p style='text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;'>Vago Booking © 2026. Vui lòng không trả lời email tự động này.</p></div>";

        sendEmailWrapper(to, subject, htmlMsg);
    }

    @Override
    @Async
    public void sendBookingCancellationEmail(Booking booking) {
        String to = booking.getUser() != null ? booking.getUser().getEmail() : booking.getGuestEmail();
        String customerName = booking.getUser() != null ? booking.getUser().getFullName() : booking.getGuestName();
        String subject = "Vago - Việc đặt phòng của quý khách đã được hủy thành công (" + booking.getBookingCode()
                + ")";

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String checkIn = booking.getCheckInDate().format(formatter);
        String checkOut = booking.getCheckOutDate().format(formatter);
        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());

        StringBuilder roomDetails = new StringBuilder();
        int totalRooms = 0;
        for (BookingRoom br : booking.getBookingRooms()) {
            totalRooms += br.getQuantity();
            roomDetails.append(br.getQuantity()).append(" x ").append(br.getRoomType().getTypeName()).append("<br>");
        }

        String address = booking.getHotel().getAddressLine() + ", " + booking.getHotel().getWard() + ", "
                + booking.getHotel().getDistrict() + ", " + booking.getHotel().getCity();

        String homeLink = "http://localhost:3000";

        String htmlMsg = "<div style='background-color: #f0f2f5; padding: 30px 10px; font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.5;'>"
                + "<div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;'>"

                + "<div style='border-top: 4px solid #1e293b; padding: 30px 20px; text-align: center;'>"
                + "<h2 style='color: #1e293b; margin-top: 0; font-size: 22px;'>Việc đặt phòng của quý khách đã được hủy thành công</h2>"
                + "<p style='font-size: 15px; margin-top: 20px;'>Kính gửi " + customerName
                + "&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Mã đặt chỗ: " + booking.getBookingCode() + "</strong></p>"
                + "<p style='font-size: 14px; color: #475569; line-height: 1.6; margin-top: 20px;'>"
                + "Chúng tôi xác nhận đã hủy phòng của quý khách tại <strong>" + booking.getHotel().getHotelName()
                + "</strong>. "
                + "Quý khách có thể đã bị chỗ nghỉ tính phí cho tất cả hoặc một phần thời gian ở – điều này hoàn toàn bình thường. "
                + "Nếu vậy, việc hoàn tiền của quý khách sẽ do chỗ nghỉ trực tiếp xử lý. Việc hoàn tiền thường mất 10-15 ngày làm việc. "
                + "Để đặt thêm bất kỳ câu hỏi nào, vui lòng liên hệ trực tiếp với chỗ nghỉ.</p>"
                + "<p style='font-size: 15px; color: #333; margin-top: 20px;'>Cảm ơn vì đã đặt phòng với Vago!</p>"
                + "<a href='" + homeLink
                + "' style='display: inline-block; margin-top: 20px; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 14px;'>Thực hiện đơn đặt phòng khác</a></div>"

                + "<div style='background-color: #f8fafc; padding: 20px; margin: 0 20px 20px 20px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0;'>"
                + "<p style='margin: 0; font-size: 14px; color: #334155;'>Vago đã bắt đầu hoàn trả vào phương thức thanh toán ban đầu của quý khách (nếu có).</p></div>"

                + "<div style='background-color: #ffffff; padding: 20px; border-top: 1px solid #e0e0e0;'>"
                + "<h3 style='margin: 0 0 10px 0; font-size: 18px; color: #1e293b;'>"
                + booking.getHotel().getHotelName() + "</h3>"
                + "<p style='margin: 0 0 20px 0; font-size: 13px; color: #64748b;'>" + address + "</p>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='text-align: center; border-top: 1px solid #cbd5e1; padding-top: 15px;'>"
                + "<tr><td width='50%' style='border-right: 1px solid #cbd5e1;'><p style='margin: 0; font-size: 13px; color: #64748b;'>Nhận phòng</p><p style='margin: 5px 0; font-size: 16px; font-weight: bold; color: #333;'>"
                + checkIn + "</p><p style='margin: 0; font-size: 12px; color: #64748b;'>(sau 14:00)</p></td>"
                + "<td width='50%'><p style='margin: 0; font-size: 13px; color: #64748b;'>Trả phòng</p><p style='margin: 5px 0; font-size: 16px; font-weight: bold; color: #333;'>"
                + checkOut
                + "</p><p style='margin: 0; font-size: 12px; color: #64748b;'>(trước 12:00)</p></td></tr></table></div>"

                + "<div style='padding: 20px; border-top: 1px solid #e0e0e0;'>"
                + "<h4 style='margin: 0 0 15px 0; font-size: 16px; color: #1e293b;'>Thông tin về Đơn đặt phòng</h4>"
                + "<table width='100%' cellpadding='8' cellspacing='0' style='font-size: 14px; color: #334155;'>"
                + "<tr><td width='35%' style='border-bottom: 1px dashed #e2e8f0;'><strong>Đặt phòng:</strong></td><td style='border-bottom: 1px dashed #e2e8f0;'>"
                + totalRooms + " phòng, " + nights + " đêm</td></tr>"
                + "<tr><td style='border-bottom: 1px dashed #e2e8f0;'><strong>Loại phòng:</strong></td><td style='border-bottom: 1px dashed #e2e8f0;'>"
                + roomDetails.toString() + "</td></tr>"
                + "<tr><td style='border-bottom: 1px dashed #e2e8f0;'><strong>Khách chính:</strong></td><td style='border-bottom: 1px dashed #e2e8f0;'>"
                + customerName + "</td></tr></table></div>"

                + "</div><p style='text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;'>Vago Booking © 2026. Vui lòng không trả lời email tự động này.</p></div>";

        sendEmailWrapper(to, subject, htmlMsg);
    }

    private void sendEmailWrapper(String to, String subject, String htmlMsg) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("nguyenhuynhphuc1210@gmail.com", "Vago");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlMsg, true);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            e.printStackTrace();
            System.err.println("Lỗi khi gửi email: " + e.getMessage());
        }
    }
}