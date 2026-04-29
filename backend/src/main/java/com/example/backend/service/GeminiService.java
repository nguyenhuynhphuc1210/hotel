package com.example.backend.service;

import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelPolicy;
import com.example.backend.entity.RoomType;
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
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    private final HotelPolicyRepository hotelPolicyRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String askGemini(Long hotelId, String userPrompt) {
        try {
            StringBuilder contextBuilder = new StringBuilder();
            
            if (hotelId != null) {

                Hotel hotel = hotelRepository.findByIdWithRoomTypes(hotelId)
                        .orElseThrow(() -> new RuntimeException("Khách sạn không tồn tại"));

                HotelPolicy policy = hotelPolicyRepository.findByHotel_Id(hotelId).orElse(null);

                contextBuilder.append("BẠN LÀ: Nhân viên lễ tân ảo chuyên nghiệp của khách sạn ").append(hotel.getHotelName()).append(".\n");
                contextBuilder.append("NHIỆM VỤ: Trả lời câu hỏi của khách hàng dựa trên dữ liệu thực tế dưới đây một cách lịch sự, ngắn gọn.\n\n");

                contextBuilder.append("--- DỮ LIỆU KHÁCH SẠN ---\n");
                contextBuilder.append("- Tên: ").append(hotel.getHotelName()).append("\n");
                contextBuilder.append("- Địa chỉ: ").append(hotel.getAddressLine()).append(", ").append(hotel.getDistrict()).append(", ").append(hotel.getCity()).append("\n");
                contextBuilder.append("- Hotline: ").append(hotel.getPhone()).append("\n");
                contextBuilder.append("- Mô tả: ").append(hotel.getDescription() != null ? hotel.getDescription() : "Khách sạn tiện nghi, phục vụ tận tâm.").append("\n\n");

                contextBuilder.append("--- THÔNG TIN PHÒNG & GIÁ ---\n");
                if (hotel.getRoomTypes() != null && !hotel.getRoomTypes().isEmpty()) {
                    for (RoomType rt : hotel.getRoomTypes()) {
                        contextBuilder.append(" + Loại phòng: ").append(rt.getTypeName())
                                .append(" | Sức chứa: ").append(rt.getMaxAdults()).append(" người lớn");
                        if (rt.getMaxChildren() != null && rt.getMaxChildren() > 0) {
                            contextBuilder.append(", ").append(rt.getMaxChildren()).append(" trẻ em");
                        }
                        contextBuilder.append(" | Giá từ: ").append(rt.getBasePrice()).append(" VNĐ.\n");
                    }
                }

                contextBuilder.append("\n--- CHÍNH SÁCH & QUY ĐỊNH ---\n");
                if (policy != null) {
                    contextBuilder.append(" + Giờ nhận phòng: ").append(policy.getCheckInTime()).append("\n"); // [cite: 194-195]
                    contextBuilder.append(" + Giờ trả phòng: ").append(policy.getCheckOutTime()).append("\n"); // [cite: 197-198]
                    contextBuilder.append(" + Quy định trẻ em: ").append(policy.getChildrenPolicy()).append("\n"); // [cite: 202]
                    contextBuilder.append(" + Quy định thú cưng: ").append(policy.getPetPolicy() != null ? policy.getPetPolicy() : "Vui lòng liên hệ trực tiếp").append("\n"); // [cite: 203-204]
                    contextBuilder.append(" + Chính sách hủy: ").append(policy.getCancellationPolicy()).append("\n"); // [cite: 199-200]
                }

                contextBuilder.append("\n--- QUY TẮC TRẢ LỜI ---\n");
                contextBuilder.append("1. Chỉ trả lời dựa trên dữ liệu trên. Không tự bịa thông tin.\n");
                contextBuilder.append("2. Nếu khách hỏi về dịch vụ không có trong dữ liệu (ví dụ: bãi xe, hồ bơi), hãy trả lời: 'Dạ hiện tại em chưa có thông tin cụ thể về dịch vụ này, anh/chị vui lòng nhấn vào tab \"Chủ khách sạn\" để trao đổi trực tiếp ạ.'\n");
                contextBuilder.append("3. Luôn xưng hô lễ phép (Dạ, thưa anh/chị).\n");

            } else {
                contextBuilder.append("Bạn là trợ lý ảo của hệ thống đặt phòng Vago tại TP. Hồ Chí Minh. Hãy tư vấn dựa trên danh sách sau:\n");

                String districtKeyword = extractHCMCDistrict(userPrompt);
                
                Page<Hotel> hotelPage;
                if (!districtKeyword.isEmpty()) {
                    hotelPage = hotelRepository.searchHotels(
                            districtKeyword,
                            null,
                            null, null, null, null, 
                            PageRequest.of(0, 10)
                    );
                    contextBuilder.append("Kết quả tìm kiếm cho khu vực '").append(districtKeyword).append("':\n");
                } else {
                    hotelPage = hotelRepository.searchHotels(
                            null, null, null, null, null, null, 
                            PageRequest.of(0, 5)
                    );
                    contextBuilder.append("Các khách sạn nổi bật:\n");
                }

                List<Hotel> hotels = hotelPage.getContent();

                if (hotels.isEmpty()) {
                    contextBuilder.append("- Hiện tại chưa có khách sạn nào trống phòng ở khu vực này.\n");
                } else {
                    for (Hotel h : hotels) {
                        contextBuilder.append("- ").append(h.getHotelName())
                                .append(" | Địa chỉ: ").append(h.getAddressLine()).append(", ")
                                .append(h.getWard()).append(", ").append(h.getDistrict()).append("\n"); // Không cần getCity() nữa vì chỉ ở TP.HCM
                    }
                }
                
                contextBuilder.append("\nDựa vào danh sách trên, hãy trả lời khách hàng. Nếu danh sách trống, hãy xin lỗi và mời khách tìm quận khác.\n");
            }

            contextBuilder.append("\nCÂU HỎI CỦA KHÁCH: ").append(userPrompt);

            return callGeminiApi(contextBuilder.toString());

        } catch (Exception e) {
            log.error("Lỗi GeminiService: {}", e.getMessage());
            return "Xin lỗi, em đang gặp chút trục trặc kỹ thuật. Anh/chị vui lòng thử lại sau hoặc chat trực tiếp với Chủ khách sạn nhé!";
        }
    }

    private String callGeminiApi(String prompt) throws Exception {
        Map<String, Object> bodyMap = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)))));
        
        String requestBody = objectMapper.writeValueAsString(bodyMap);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);
        String fullUrl = geminiApiUrl + apiKey;
        
        ResponseEntity<String> response = restTemplate.postForEntity(fullUrl, request, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }

    private String extractHCMCDistrict(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) return "";
        String lowerPrompt = prompt.toLowerCase();

        Pattern numberPattern = Pattern.compile("(quận|q\\.?)\\s*([1-9]|1[0-2])\\b");
        Matcher matcher = numberPattern.matcher(lowerPrompt);
        if (matcher.find()) {
            return "Quận " + matcher.group(2);
        }

        String[][] stringDistricts = {
            {"bình thạnh", "Quận Bình Thạnh"},
            {"gò vấp", "Quận Gò Vấp"},
            {"phú nhuận", "Quận Phú Nhuận"},
            {"tân bình", "Quận Tân Bình"},
            {"tân phú", "Quận Tân Phú"},
            {"bình tân", "Quận Bình Tân"},
            {"thủ đức", "TP Thủ Đức"},
            {"bình chánh", "Huyện Bình Chánh"},
            {"củ chi", "Huyện Củ Chi"},
            {"hóc môn", "Huyện Hóc Môn"},
            {"nhà bè", "Huyện Nhà Bè"},
            {"cần giờ", "Huyện Cần Giờ"}
        };

        for (String[] districtInfo : stringDistricts) {
            if (lowerPrompt.contains(districtInfo[0])) {
                return districtInfo[1];
            }
        }

        return "";
    }
}