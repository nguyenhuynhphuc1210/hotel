package com.example.backend.service;

import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelAmenity;
import com.example.backend.entity.HotelPolicy;
import com.example.backend.entity.RoomTypeAmenity;
import com.example.backend.entity.Promotion;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.RoomTypeAmenityRepository;
import com.example.backend.repository.HotelAmenityRepository;
import com.example.backend.repository.HotelPolicyRepository;
import com.example.backend.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final HotelAmenityRepository hotelAmenityRepository;
    private final RoomTypeAmenityRepository roomTypeAmenityRepository;
    private final PromotionRepository promotionRepository; // Thêm dòng này

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String askGemini(Long hotelId, String userPrompt) {
        if (hotelId == null) {
            return "Dạ, hiện tại em chỉ hỗ trợ tư vấn thông tin chi tiết của từng khách sạn. Anh/chị vui lòng vào trang chi tiết của một khách sạn cụ thể để em có thể hỗ trợ tốt nhất nhé!";
        }

        try {
            String context = buildHotelContext(hotelId);
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

        List<HotelAmenity> hotelAmenities = hotelAmenityRepository.findByHotel_Id(hotelId);
        if (hotelAmenities != null && !hotelAmenities.isEmpty()) {
            sb.append("- Tiện ích chung: ");
            hotelAmenities.forEach(ha -> {
                sb.append(ha.getAmenity().getAmenityName()); 
                if (!ha.getIsFree()) {
                    sb.append(" (Phí: ").append(ha.getAdditionalFee()).append(" VNĐ)");
                }
                sb.append(", ");
            });
            sb.append("\n");
        }

        if (hotel.getRoomTypes() != null && !hotel.getRoomTypes().isEmpty()) {
            sb.append("\n--- CÁC LOẠI PHÒNG & TIỆN ÍCH PHÒNG ---\n");
            hotel.getRoomTypes().forEach(rt -> {
                sb.append("- ").append(rt.getTypeName())
                  .append(" (Giá từ: ").append(rt.getBasePrice()).append(" VNĐ/đêm). ");
                
                List<RoomTypeAmenity> roomAmenities = roomTypeAmenityRepository.findByRoomType_Id(rt.getId());
                if (roomAmenities != null && !roomAmenities.isEmpty()) {
                    sb.append("Tiện ích: ");
                    roomAmenities.forEach(rta -> {
                        sb.append(rta.getAmenity().getAmenityName());
                        if (!rta.getIsFree()) {
                            sb.append(" (Phụ phí: ").append(rta.getAdditionalFee()).append(" VNĐ)");
                        }
                        sb.append(", ");
                    });
                }
                sb.append("\n");
            });
        }

        if (policy != null) {
            sb.append("\n--- CHÍNH SÁCH ---\n");
            sb.append("- Nhận phòng: ").append(policy.getCheckInTime()).append(" | Trả phòng: ").append(policy.getCheckOutTime()).append("\n");
            sb.append("- Trẻ em: ").append(policy.getChildrenPolicy()).append("\n");
            sb.append("- Thú cưng: ").append(policy.getPetPolicy() != null ? policy.getPetPolicy() : "Không cho phép").append("\n");
        }

        // ================= THÊM LOGIC PROMOTION Ở ĐÂY =================
        List<Promotion> allPromotions = promotionRepository.findByHotel_Id(hotelId);
        if (allPromotions != null && !allPromotions.isEmpty()) {
            // Chỉ lọc lấy các mã đang active và trong thời gian hiệu lực
            List<Promotion> validPromos = allPromotions.stream()
                    .filter(Promotion::isValid)
                    .collect(Collectors.toList());

            if (!validPromos.isEmpty()) {
                sb.append("\n--- CHƯƠNG TRÌNH KHUYẾN MÃI ĐANG ÁP DỤNG ---\n");
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                
                validPromos.forEach(promo -> {
                    sb.append("- Mã ưu đãi: ").append(promo.getPromoCode());
                    
                    if (promo.getDiscountPercent() != null) {
                        sb.append(" (Giảm ").append(promo.getDiscountPercent()).append("%)");
                    }
                    
                    if (promo.getMaxDiscountAmount() != null) {
                        sb.append(", giảm tối đa ").append(promo.getMaxDiscountAmount()).append(" VNĐ");
                    }
                    
                    if (promo.getMinOrderValue() != null && promo.getMinOrderValue().compareTo(BigDecimal.ZERO) > 0) {
                        sb.append(", áp dụng cho đơn từ ").append(promo.getMinOrderValue()).append(" VNĐ");
                    }
                    
                    if (promo.getEndDate() != null) {
                        sb.append(". Hạn dùng: ").append(promo.getEndDate().format(formatter));
                    }
                    sb.append("\n");
                });
            }
        }
        // =============================================================

        sb.append("\nLƯU Ý QUAN TRỌNG: Nếu khách hỏi thông tin KHÔNG có trong dữ liệu trên, tuyệt đối không được tự bịa ra. Hãy xin lỗi và hướng dẫn khách chat với Chủ khách sạn để được hỗ trợ.\n");
        
        return sb.toString();
    }

    private String callGeminiWithRetry(String prompt) throws Exception {
        Map<String, Object> bodyMap = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        String requestBody = objectMapper.writeValueAsString(bodyMap);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);
        String fullUrl = geminiApiUrl + apiKey;

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
}