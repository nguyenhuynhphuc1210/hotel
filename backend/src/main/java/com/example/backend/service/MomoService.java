package com.example.backend.service;

import com.example.backend.config.MomoConfig;
import com.example.backend.entity.Booking;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MomoService {

    @Value("${momo.partner-code}")
    private String partnerCode;

    @Value("${momo.access-key}")
    private String accessKey;

    @Value("${momo.secret-key}")
    private String secretKey;

    @Value("${momo.api-url}")
    private String apiUrl;

    @Value("${momo.redirect-url}")
    private String redirectUrl;

    @Value("${momo.ipn-url}")
    private String ipnUrl;

    public String createPaymentUrl(Booking booking) {
        String orderId = booking.getId() + "_" + System.currentTimeMillis();
        String requestId = orderId;

        String amountString = String.valueOf(booking.getTotalAmount().longValue());

        String orderInfo = "Thanh toan don dat phong " + booking.getBookingCode();
        String returnUrl = redirectUrl;
        String notifyUrl = ipnUrl;
        String requestType = "payWithATM";
        String extraData = "";

        String rawHash = "accessKey=" + accessKey +
                "&amount=" + amountString +
                "&extraData=" + extraData +
                "&ipnUrl=" + notifyUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + returnUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = MomoConfig.hmacSHA256(rawHash, secretKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("partnerCode", partnerCode);
        requestBody.put("partnerName", "Test Hotel");
        requestBody.put("storeId", "MomoTestStore");
        requestBody.put("requestId", requestId);

        requestBody.put("amount", booking.getTotalAmount().longValue());

        requestBody.put("orderId", orderId);
        requestBody.put("orderInfo", orderInfo);
        requestBody.put("redirectUrl", returnUrl);
        requestBody.put("ipnUrl", notifyUrl);
        requestBody.put("lang", "vi");
        requestBody.put("requestType", requestType);
        requestBody.put("extraData", extraData);
        requestBody.put("signature", signature);

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    apiUrl,
                    org.springframework.http.HttpMethod.POST,
                    entity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && responseBody.get("payUrl") != null) {
                return (String) responseBody.get("payUrl");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean verifySignature(HttpServletRequest request) {
        String partnerCode = request.getParameter("partnerCode");
        String orderId = request.getParameter("orderId");
        String requestId = request.getParameter("requestId");
        String amount = request.getParameter("amount");
        String orderInfo = request.getParameter("orderInfo");
        String orderType = request.getParameter("orderType");
        String transId = request.getParameter("transId");
        String resultCode = request.getParameter("resultCode");
        String message = request.getParameter("message");
        String payType = request.getParameter("payType");
        String responseTime = request.getParameter("responseTime");
        String extraData = request.getParameter("extraData");
        String signature = request.getParameter("signature");

        String rawHash = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;

        String signValue = MomoConfig.hmacSHA256(rawHash, secretKey);
        return signValue.equals(signature);
    }

    public boolean verifyIpnSignature(Map<String, Object> requestBody) {
        String partnerCode = (String) requestBody.get("partnerCode");
        String orderId = (String) requestBody.get("orderId");
        String requestId = (String) requestBody.get("requestId");
        String amount = String.valueOf(requestBody.get("amount"));
        String orderInfo = (String) requestBody.get("orderInfo");
        String orderType = (String) requestBody.get("orderType");
        String transId = String.valueOf(requestBody.get("transId"));
        String resultCode = String.valueOf(requestBody.get("resultCode"));
        String message = (String) requestBody.get("message");
        String payType = (String) requestBody.get("payType");
        String responseTime = String.valueOf(requestBody.get("responseTime"));
        String extraData = (String) requestBody.get("extraData");
        String signature = (String) requestBody.get("signature");

        String rawHash = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;

        String signValue = MomoConfig.hmacSHA256(rawHash, secretKey);
        return signValue.equals(signature);
    }
}