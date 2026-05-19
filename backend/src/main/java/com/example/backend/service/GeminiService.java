package com.example.backend.service;

import com.example.backend.dto.response.HotelSummaryResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelPolicy;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.HotelPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final HotelRepository hotelRepository;
    private final HotelPolicyRepository hotelPolicyRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String askGemini(Long hotelId, String userPrompt) {
        try {
            String context = (hotelId != null) ? buildHotelContext(hotelId) : buildGeneralContext(userPrompt);
            String finalPrompt = context + "\nCÂU HỎI CỦA KHÁCH: " + userPrompt;

            return callGeminiWithRetry(finalPrompt);

        } catch (Exception e) {
            log.error("Lỗi GeminiService: {}", e.getMessage());
            return "Dạ, hệ thống hỗ trợ AI đang bận một chút. Anh/chị vui lòng thử lại sau hoặc nhấn tab 'Chủ khách sạn' để được tư vấn trực tiếp ạ!";
        }
    }

    private String buildHotelContext(Long hotelId) {
        Hotel hotel = hotelRepository.findByIdWithRoomTypes(hotelId)
                .orElseThrow(() -> new RuntimeException("Khách sạn không tồn tại"));
        HotelPolicy policy = hotelPolicyRepository.findByHotel_Id(hotelId).orElse(null);

        StringBuilder sb = new StringBuilder();
        sb.append("BẠN LÀ: Nhân viên lễ tân ảo của ").append(hotel.getHotelName()).append(".\n");
        sb.append("NHIỆM VỤ: Trả lời lịch sự (Dạ, thưa), ngắn gọn, chỉ dựa trên dữ liệu sau:\n\n");
        
        sb.append("--- THÔNG TIN KHÁCH SẠN ---\n");
        sb.append("- Địa chỉ: ").append(hotel.getAddressLine()).append(", ").append(hotel.getDistrict()).append("\n");
        sb.append("- Mô tả: ").append(hotel.getDescription()).append("\n");

        if (hotel.getRoomTypes() != null) {
            sb.append("- Loại phòng: ");
            hotel.getRoomTypes().forEach(rt -> sb.append(rt.getTypeName()).append(" (Giá từ: ").append(rt.getBasePrice()).append(" VNĐ), "));
        }

        if (policy != null) {
            sb.append("\n--- CHÍNH SÁCH ---\n");
            sb.append("- Nhận phòng: ").append(policy.getCheckInTime()).append(" | Trả phòng: ").append(policy.getCheckOutTime()).append("\n");
            sb.append("- Trẻ em: ").append(policy.getChildrenPolicy()).append("\n");
            sb.append("- Thú cưng: ").append(policy.getPetPolicy() != null ? policy.getPetPolicy() : "Không cho phép").append("\n");
        }

        sb.append("\nLƯU Ý: Nếu thông khách hỏi không có trong dữ liệu (ví dụ: hồ bơi, bãi xe), hãy xin lỗi và hướng dẫn khách chat với Chủ khách sạn.\n");
        return sb.toString();
    }

    private String buildGeneralContext(String userPrompt) {
        String district = extractHCMCDistrict(userPrompt);
        
        // Gọi Repository với đầy đủ 11 tham số để tránh lỗi biên dịch
        Page<HotelSummaryResponse> hotelPage = hotelRepository.searchHotelsWithFilters(
                district.isEmpty() ? null : district,
                null, null, null, null, // district, keyword, checkIn, checkOut, nights
                1, 0,                   // adults, children
                null, null, null, null, // stars, minPrice, maxPrice, sortBy
                PageRequest.of(0, 5)    // pageable
        );

        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là trợ lý ảo Vago. Hãy tư vấn khách sạn tại TP.HCM dựa trên danh sách này:\n");
        
        for (HotelSummaryResponse h : hotelPage.getContent()) {
            sb.append("- ").append(h.getHotelName()).append(" tại ").append(h.getDistrict());
            if (h.getMinPrice() != null) sb.append(" | Giá từ: ").append(h.getMinPrice()).append(" VNĐ");
            sb.append("\n");
        }
        
        if (hotelPage.isEmpty()) sb.append("(Hiện chưa tìm thấy khách sạn phù hợp tại quận này)\n");
        
        sb.append("\nNếu không có khách sạn phù hợp, hãy xin lỗi và gợi ý khách tìm ở quận khác hoặc dùng thanh tìm kiếm.");
        return sb.toString();
    }

    private String callGeminiWithRetry(String prompt) throws Exception {
        Map<String, Object> bodyMap = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        String requestBody = objectMapper.writeValueAsString(bodyMap);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);
        String fullUrl = geminiApiUrl + apiKey;

        // Cơ chế Retry 3 lần cho lỗi 503
        for (int i = 0; i < 3; i++) {
            try {
                ResponseEntity<String> response = restTemplate.postForEntity(fullUrl, request, String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            } catch (HttpServerErrorException.ServiceUnavailable e) {
                if (i == 2) throw e;
                log.warn("Gemini bận, đang thử lại lần {}...", i + 1);
                Thread.sleep(2000);
            }
        }
        return "Xin lỗi, AI đang bận.";
    }

    private String extractHCMCDistrict(String prompt) {
        if (prompt == null) return "";
        String lower = prompt.toLowerCase();
        Pattern p = Pattern.compile("(quận|q\\.?)\\s*([1-9]|1[0-2]|bình thạnh|gò vấp|tân bình|tân phú|phú nhuận|thủ đức|bình tân)");
        Matcher m = p.matcher(lower);
        if (m.find()) {
            String q = m.group(2);
            return q.matches("\\d+") ? "Quận " + q : "Quận " + q.substring(0, 1).toUpperCase() + q.substring(1);
        }
        return "";
    }
}