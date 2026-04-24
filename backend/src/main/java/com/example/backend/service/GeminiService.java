package com.example.backend.service;

import com.example.backend.entity.Hotel;
import com.example.backend.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final HotelRepository hotelRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String askGemini(Long hotelId, String userPrompt) {
        try {
            StringBuilder contextBuilder = new StringBuilder();

            if (hotelId != null) {
                Hotel hotel = hotelRepository.findByIdWithRoomTypes(hotelId)
                        .orElseThrow(() -> new RuntimeException("Khách sạn không tồn tại"));

                contextBuilder.append("Bạn là trợ lý ảo của khách sạn ").append(hotel.getHotelName()).append(".\n");
                contextBuilder.append("Dưới đây là thông tin thực tế về khách sạn này:\n");
                contextBuilder.append("- Mô tả: ")
                        .append(hotel.getDescription() != null ? hotel.getDescription() : "Chưa cập nhật").append("\n");
                contextBuilder.append("- Địa chỉ: ").append(hotel.getAddressLine()).append(", ")
                        .append(hotel.getDistrict()).append(", ").append(hotel.getCity()).append("\n");
                contextBuilder.append("- Số điện thoại: ").append(hotel.getPhone()).append("\n");

                contextBuilder.append("- Thông tin phòng và giá:\n");
                if (hotel.getRoomTypes() != null && !hotel.getRoomTypes().isEmpty()) {
                    hotel.getRoomTypes().forEach(rt -> {
                        contextBuilder.append("  + Loại phòng: ").append(rt.getTypeName())
                                .append(", Sức chứa tối đa: ").append(rt.getMaxAdults()).append(" người lớn");

                        if (rt.getMaxChildren() != null && rt.getMaxChildren() > 0) {
                            contextBuilder.append(" và ").append(rt.getMaxChildren()).append(" trẻ em");
                        }

                        contextBuilder.append(", Giá cơ bản: ").append(rt.getBasePrice()).append(" VNĐ.\n");
                    });
                }

                contextBuilder.append("\nHãy dựa vào các thông tin trên để trả lời khách hàng một cách lịch sự. ");
                contextBuilder.append(
                        "Nếu khách hỏi thông tin không có trong mô tả (ví dụ: chỗ để xe, mang thú cưng...), hãy lịch sự bảo khách nhắn tin trực tiếp cho chủ khách sạn qua tab 'Chủ khách sạn' để được hỗ trợ.\n");

            } else {
                contextBuilder.append("Bạn là trợ lý ảo của hệ thống đặt phòng Vago.\n");

                List<Hotel> hotels = hotelRepository.findAll().stream().limit(10).toList();

                contextBuilder.append("Dưới đây là một số khách sạn trong hệ thống:\n");

                for (Hotel h : hotels) {
                    contextBuilder.append("- ")
                            .append(h.getHotelName())
                            .append(", địa chỉ: ")
                            .append(h.getDistrict())
                            .append(", ")
                            .append(h.getCity());

                    if (h.getDescription() != null) {
                        contextBuilder.append(", mô tả: ").append(h.getDescription());
                    }

                    contextBuilder.append("\n");
                }

                contextBuilder.append("\nHãy dựa vào danh sách trên để tư vấn khách sạn phù hợp.\n");
            }

            contextBuilder.append("\nCâu hỏi của khách hàng: ").append(userPrompt);
            String finalPrompt = contextBuilder.toString();

            Map<String, Object> bodyMap = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", finalPrompt)))));
            String requestBody = objectMapper.writeValueAsString(bodyMap);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> request = new HttpEntity<>(requestBody, headers);

            String fullUrl = geminiApiUrl + apiKey;
            ResponseEntity<String> response = restTemplate.postForEntity(fullUrl, request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        } catch (Exception e) {
            log.error("Lỗi khi gọi Gemini API: {}", e.getMessage(), e);
            return "Xin lỗi, hệ thống AI đang bảo trì hoặc quá tải. Bạn vui lòng thử lại sau hoặc chuyển sang chat với Chủ khách sạn nhé!";
        }
    }
}