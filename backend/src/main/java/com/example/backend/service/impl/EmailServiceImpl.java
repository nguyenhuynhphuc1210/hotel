package com.example.backend.service.impl;

import com.example.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Override
    @Async
    public void sendOtpEmail(String to, String otp) {
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
}