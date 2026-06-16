package com.example.backend.service;

import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelAmenity;
import com.example.backend.entity.HotelPolicy;
import com.example.backend.entity.RoomTypeAmenity;
import com.example.backend.entity.Promotion;
import com.example.backend.entity.RoomType;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.RoomTypeAmenityRepository;
import com.example.backend.repository.HotelAmenityRepository;
import com.example.backend.repository.HotelPolicyRepository;
import com.example.backend.repository.PromotionRepository;
import com.example.backend.repository.RoomCalendarRepository;

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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
    private final PromotionRepository promotionRepository;
    private final RoomCalendarRepository roomCalendarRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String askGemini(Long hotelId, String userPrompt) {
        if (hotelId == null) {
            return "Dạ, hiện tại em chỉ hỗ trợ tư vấn thông tin chi tiết của từng khách sạn. Anh/chị vui lòng vào trang chi tiết của một khách sạn cụ thể để em có thể hỗ trợ tốt nhất nhé!";
        }

        try {
            String context = buildHotelContext(hotelId);
            String lower = userPrompt == null ? "" : userPrompt.toLowerCase();
            StringBuilder systemDirectives = new StringBuilder();

            if (lower.contains("còn phòng") || lower.contains("còn trống") || lower.contains("còn phòng không")) {
                Optional<LocalDate> dateOpt = parseDateFromPrompt(userPrompt);

                if (dateOpt.isPresent()) {
                    Hotel hotel = hotelRepository.findByIdWithRoomTypes(hotelId).orElse(null);
                    if (hotel != null && hotel.getRoomTypes() != null) {
                        com.example.backend.entity.RoomType matched = findRoomTypeByName(hotel, userPrompt);

                        if (matched != null) {
                            String availMsg = buildAvailabilityMessage(matched.getId(), matched.getTypeName(),
                                    dateOpt.get(), hotelId);
                            systemDirectives.append("\n--- THÔNG TIN TRA CỨU CÒN PHÒNG ---\n")
                                    .append(availMsg)
                                    .append("\n(Hãy dùng thông tin tra cứu trên để trả lời trực tiếp cho khách một cách tự nhiên, không báo là không có thông tin và không cần xin lỗi).\n");
                        }
                    }
                } else {
                    systemDirectives.append(
                            "\n--- HƯỚNG DẪN XỬ LÝ CÒN PHÒNG ---\nKhách đang hỏi về tình trạng phòng nhưng thiếu Ngày hoặc Tên loại phòng. AI hãy phản hồi lịch sự và yêu cầu khách cung cấp thêm (ví dụ: ngày 01/07/2026, phòng Superior) để hệ thống kiểm tra nhé.\n");
                }
            }

            if (lower.contains("hút thuốc") || lower.contains("smoking")) {
                Hotel hotel = hotelRepository.findByIdWithRoomTypes(hotelId).orElse(null);

                boolean hasSmokingArea = false;
                boolean hasAnySmokingRoom = false;
                RoomType matchedRoom = null;

                if (hotel != null) {
                    List<HotelAmenity> hotelAmenities = hotelAmenityRepository.findByHotel_Id(hotelId);
                    if (hotelAmenities != null) {
                        hasSmokingArea = hotelAmenities.stream()
                                .anyMatch(ha -> {
                                    String name = ha.getAmenity().getAmenityName().toLowerCase();
                                    return name.contains("hút thuốc") || name.contains("smoking");
                                });
                    }

                    if (hotel.getRoomTypes() != null) {
                        hasAnySmokingRoom = hotel.getRoomTypes().stream()
                                .anyMatch(rt -> Boolean.FALSE.equals(rt.getIsNonSmoking()));

                        matchedRoom = findRoomTypeByName(hotel, userPrompt);
                    }
                }

                if (matchedRoom != null) {
                    boolean isNonSmoking = Boolean.TRUE.equals(matchedRoom.getIsNonSmoking());
                    boolean roomAllowsSmoking = !isNonSmoking;

                    systemDirectives.append("\n--- THÔNG TIN HÚT THUỐC TRONG PHÒNG ---\n");
                    if (roomAllowsSmoking) {
                        systemDirectives.append("Dữ liệu hệ thống: Loại phòng ").append(matchedRoom.getTypeName())
                                .append(" CHO PHÉP hút thuốc.\n")
                                .append("AI hãy trả lời trực tiếp: Dạ, phòng ").append(matchedRoom.getTypeName())
                                .append(" là phòng được phép hút thuốc ạ.\n");
                    } else {
                        systemDirectives.append("Dữ liệu hệ thống: Loại phòng ").append(matchedRoom.getTypeName())
                                .append(" là phòng KHÔNG HÚT THUỐC.\n")
                                .append("AI hãy trả lời trực tiếp: Dạ, phòng ").append(matchedRoom.getTypeName())
                                .append(" bên em là phòng không hút thuốc để đảm bảo không khí trong lành ạ. ");
                        if (hasSmokingArea) {
                            systemDirectives.append(
                                    "Tuy nhiên, khách sạn có bố trí khu vực hút thuốc riêng (smoking area) tại khuôn viên để anh/chị sử dụng.\n");
                        } else {
                            systemDirectives.append("\n");
                        }
                    }
                } else {
                    systemDirectives.append("\n--- QUY ĐỊNH HÚT THUỐC ---")
                            .append("\nAI HÃY TRẢ LỜI CHÍNH XÁC VÀ ĐẦY ĐỦ THEO MẪU SAU:\n");

                    if (hasAnySmokingRoom) {
                        systemDirectives.append(
                                "\"Dạ, khách sạn bên em có phân chia các hạng phòng cho phép hút thuốc và phòng không hút thuốc riêng biệt. Để em hỗ trợ kiểm tra chính xác nhất, anh/chị vui lòng cho em biết tên loại phòng anh/chị đang quan tâm nhé.\"\n");
                    } else if (hasSmokingArea) {
                        systemDirectives.append(
                                "\"Dạ, khách sạn là khách sạn không hút thuốc (smoke-free property), nhưng có khu vực hút thuốc riêng (smoking area) được bố trí tại khách sạn. Nếu bạn muốn mình kiểm tra giúp phòng bạn định đặt có phải phòng không hút thuốc không, bạn cho mình biết tên loại phòng và ngược lại ạ.\"\n");
                    } else {
                        systemDirectives.append(
                                "\"Dạ, hiện tại toàn bộ khuôn viên khách sạn bên em hoàn toàn là khu vực không hút thuốc (smoke-free property) và không có khu vực hút thuốc riêng đâu ạ. Tất cả các hạng phòng đều nghiêm cấm hút thuốc để bảo vệ sức khỏe chung ạ.\"\n");
                    }
                }
            }

            String finalPrompt = context + systemDirectives.toString() + "\nCÂU HỎI CỦA KHÁCH: " + userPrompt;

            return callGeminiWithRetry(finalPrompt);

        } catch (Exception e) {
            log.error("Lỗi GeminiService: {}", e.getMessage());
            return "Dạ, hệ thống hỗ trợ AI đang bận một chút. Anh/chị vui lòng thử lại sau hoặc nhấn tab 'Chủ khách sạn' để được tư vấn trực tiếp ạ!";
        }
    }

    private String buildAvailabilityMessage(Long roomTypeId, String typeName, LocalDate date, Long hotelId) {
        try {
            Optional<com.example.backend.entity.RoomCalendar> rcOpt = roomCalendarRepository
                    .findByRoomType_IdAndDate(roomTypeId, date);
            if (rcOpt.isPresent()) {
                com.example.backend.entity.RoomCalendar rc = rcOpt.get();
                int remaining = (rc.getTotalRooms() == null ? 0 : rc.getTotalRooms())
                        - (rc.getBookedRooms() == null ? 0 : rc.getBookedRooms());
                if (Boolean.TRUE.equals(rc.getIsAvailable()) && remaining > 0) {
                    return String.format("Dạ, ngày %s, loại phòng %s còn phòng (%d phòng).",
                            date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), typeName, remaining);
                } else {
                    return String.format("Dạ, ngày %s, loại phòng %s hiện không còn phòng.",
                            date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), typeName);
                }
            } else {
                return String.format(
                        "Dạ, em không có dữ liệu lịch cho ngày %s của loại phòng %s. Anh/chị vui lòng kiểm tra lại ngày hoặc thử liên hệ chủ khách sạn.",
                        date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), typeName);
            }
        } catch (Exception ex) {
            log.error("Lỗi kiểm tra availability: {}", ex.getMessage());
            return "Dạ, em không thể kiểm tra tình trạng phòng lúc này. Anh/chị vui lòng thử lại sau.";
        }
    }

    private Optional<LocalDate> parseDateFromPrompt(String prompt) {
        if (prompt == null)
            return Optional.empty();
        Pattern p = Pattern.compile("\\b\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b");
        Matcher m = p.matcher(prompt);
        if (m.find()) {
            String s = m.group();
            try {
                if (s.contains("/")) {
                    DateTimeFormatter f = DateTimeFormatter.ofPattern("d/M/yyyy");
                    return Optional.of(LocalDate.parse(s, f));
                } else if (s.contains("-")) {
                    String[] parts = s.split("-");
                    if (parts[0].length() == 4) { // yyyy-MM-dd
                        return Optional.of(LocalDate.parse(s));
                    } else { // dd-MM-yyyy
                        DateTimeFormatter f = DateTimeFormatter.ofPattern("d-M-yyyy");
                        return Optional.of(LocalDate.parse(s, f));
                    }
                }
            } catch (Exception ex) {
                log.debug("Không parse được ngày từ chuỗi: {}", s);
            }
        }
        return Optional.empty();
    }

    private com.example.backend.entity.RoomType findRoomTypeByName(Hotel hotel, String prompt) {
        if (hotel == null || hotel.getRoomTypes() == null || prompt == null)
            return null;
        String lower = prompt.toLowerCase();
        for (com.example.backend.entity.RoomType rt : hotel.getRoomTypes()) {
            if (rt.getTypeName() != null && lower.contains(rt.getTypeName().toLowerCase())) {
                return rt;
            }
        }
        for (com.example.backend.entity.RoomType rt : hotel.getRoomTypes()) {
            if (rt.getTypeName() != null) {
                String[] words = rt.getTypeName().toLowerCase().split("\\s+");
                for (String w : words) {
                    if (w.length() > 2 && lower.contains(w))
                        return rt;
                }
            }
        }
        return null;
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
            sb.append("\n--- CÁC LOẠI PHÒNG & QUY ĐỊNH ---\n");
            hotel.getRoomTypes().forEach(rt -> {
                sb.append("- ").append(rt.getTypeName())
                        .append(" (Giá từ: ").append(rt.getBasePrice()).append(" VNĐ/đêm). ");

                if (Boolean.TRUE.equals(rt.getIsNonSmoking())) {
                    sb.append("[Quy định: PHÒNG KHÔNG HÚT THUỐC]. ");
                } else {
                    sb.append("[Quy định: CHO PHÉP HÚT THUỐC]. ");
                }

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
            sb.append("- Nhận phòng: ").append(policy.getCheckInTime()).append(" | Trả phòng: ")
                    .append(policy.getCheckOutTime()).append("\n");
            sb.append("- Trẻ em: ").append(policy.getChildrenPolicy()).append("\n");
            sb.append("- Thú cưng: ").append(policy.getPetPolicy() != null ? policy.getPetPolicy() : "Không cho phép")
                    .append("\n");
        }

        List<Promotion> allPromotions = promotionRepository.findByHotel_Id(hotelId);
        if (allPromotions != null && !allPromotions.isEmpty()) {
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

        sb.append(
                "\nLƯU Ý QUAN TRỌNG: Nếu khách hỏi thông tin KHÔNG có trong dữ liệu trên, tuyệt đối không được tự bịa ra. Hãy xin lỗi và hướng dẫn khách chat với Chủ khách sạn để được hỗ trợ.\n");

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
                if (i == 2)
                    throw e;
                log.warn("Gemini bận, đang thử lại lần {}...", i + 1);
                Thread.sleep(2000);
            }
        }
        return "Xin lỗi, AI đang bận.";
    }
}