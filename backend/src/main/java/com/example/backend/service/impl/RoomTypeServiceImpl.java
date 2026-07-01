package com.example.backend.service.impl;

import static com.example.backend.security.SecurityUtils.*;

import com.example.backend.dto.request.RoomTypeRequest;
import com.example.backend.dto.response.RoomTypeImportResponse;
import com.example.backend.dto.response.RoomTypeResponse;
import com.example.backend.dto.response.RoomTypeSummaryResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.RoomType;
import com.example.backend.enums.HotelStatus;
import com.example.backend.mapper.RoomTypeMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.RoomTypeService;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomTypeServiceImpl implements RoomTypeService {

    private final RoomTypeRepository roomTypeRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeMapper roomTypeMapper;
    private final RoomCalendarServiceImpl roomCalendarService;
    private final DataFormatter formatter = new DataFormatter();

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getAllRoomTypes() {
        List<RoomType> roomTypes;

        if (isAdmin()) {
            roomTypes = roomTypeRepository.findAllNotDeletedSystemRoomTypes();
        } else if (isHotelOwner()) {
            roomTypes = roomTypeRepository.findAllNotDeletedRoomTypesByOwner(getCurrentUserEmail());
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập trang quản trị");
        }

        return roomTypes.stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getActiveRoomTypes() {
        return roomTypeRepository.findByIsActiveTrueAndDeletedAtIsNull()
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAvailableBedTypes() {
        return roomTypeRepository.findDistinctBedTypesByIsActiveTrueAndDeletedAtIsNull()
                .stream()
                .map(String::trim)
                .filter(type -> !type.isBlank())
                .map(String::valueOf)
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getActiveRoomTypesByHotel(Long hotelId) {
        return roomTypeRepository.findActiveRoomTypesByHotel(hotelId)
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getAllRoomTypesByHotelForManagement(Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + hotelId));

        checkOwnerOrAdmin(hotel.getOwner().getEmail());

        return roomTypeRepository.findByHotelIdAndDeletedAtIsNull(hotelId)
                .stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoomTypeResponse getRoomTypeById(Long id) {
        return roomTypeRepository.findById(id)
                .map(roomTypeMapper::toRoomTypeResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));
    }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(
                        () -> new EntityNotFoundException("Không tìm thấy khách sạn với ID = " + request.getHotelId()));

        checkOwner(hotel.getOwner().getEmail());

        RoomType roomType = roomTypeMapper.toRoomType(request, hotel);

        RoomType savedRoomType = roomTypeRepository.save(roomType);

        roomCalendarService.generateCalendarForNewRoomType(savedRoomType);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwner(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() != null) {
            throw new IllegalArgumentException("Không thể cập nhật thông tin loại phòng đang nằm trong thùng rác!");
        }

        boolean isPriceChanged = existing.getBasePrice().compareTo(request.getBasePrice()) != 0;
        boolean isRoomsChanged = !existing.getTotalRooms().equals(request.getTotalRooms());

        existing.setTypeName(request.getTypeName());
        existing.setDescription(request.getDescription());
        existing.setMaxAdults(request.getMaxAdults());
        existing.setMaxChildren(request.getMaxChildren());
        existing.setBedType(request.getBedType());
        existing.setRoomSize(request.getRoomSize());
        existing.setBasePrice(request.getBasePrice());
        existing.setTotalRooms(request.getTotalRooms());
        existing.setIsNonSmoking(request.getIsNonSmoking());

        RoomType savedRoomType = roomTypeRepository.save(existing);

        if (isPriceChanged || isRoomsChanged) {
            roomCalendarService.syncFutureCalendar(
                    savedRoomType.getId(),
                    isPriceChanged ? savedRoomType.getBasePrice() : null,
                    isRoomsChanged ? savedRoomType.getTotalRooms() : null);
        }

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse suspendRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwner(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() != null) {
            throw new IllegalArgumentException("Không thể tạm ngưng loại phòng đã bị xóa!");
        }

        if (!Boolean.TRUE.equals(existing.getIsActive())) {
            throw new IllegalArgumentException("Loại phòng này đã được tạm ngưng trước đó.");
        }

        existing.setIsActive(false);
        RoomType savedRoomType = roomTypeRepository.save(existing);

        roomCalendarService.deactivateFutureCalendar(id);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public RoomTypeResponse reactivateRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwner(existing.getHotel().getOwner().getEmail());

        if (existing.getHotel() != null && existing.getHotel().getStatus() != HotelStatus.APPROVED) {
            throw new IllegalArgumentException(
                    "Không thể mở bán loại phòng vì khách sạn hiện không ở trạng thái hoạt động (Trạng thái hiện tại: "
                            + existing.getHotel().getStatus() + ")");
        }

        if (existing.getDeletedAt() != null) {
            throw new IllegalArgumentException("Không thể mở bán loại phòng đang nằm trong thùng rác!");
        }

        if (Boolean.TRUE.equals(existing.getIsActive())) {
            throw new IllegalArgumentException("Loại phòng này hiện vẫn đang được mở bán.");
        }

        existing.setIsActive(true);
        RoomType savedRoomType = roomTypeRepository.save(existing);

        roomCalendarService.reactivateFutureCalendar(id);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional
    public void deleteRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwner(existing.getHotel().getOwner().getEmail());

        existing.setDeletedAt(LocalDateTime.now());
        existing.setIsActive(false);
        roomTypeRepository.save(existing);

        roomCalendarService.deactivateFutureCalendar(id);
    }

    @Override
    @Transactional
    public RoomTypeResponse restoreRoomType(Long id) {
        RoomType existing = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy loại phòng với ID = " + id));

        checkOwner(existing.getHotel().getOwner().getEmail());

        if (existing.getDeletedAt() == null) {
            throw new IllegalArgumentException("Loại phòng này không nằm trong thùng rác.");
        }

        if (existing.getHotel().getDeletedAt() != null) {
            throw new IllegalArgumentException(
                    "Khách sạn của loại phòng này đang bị xóa. Vui lòng khôi phục khách sạn trước.");
        }

        existing.setDeletedAt(null);
        existing.setIsActive(false);

        RoomType savedRoomType = roomTypeRepository.save(existing);

        return roomTypeMapper.toRoomTypeResponse(savedRoomType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeSummaryResponse> getDeletedRoomTypes() {
        List<RoomType> deletedTypes;

        if (isAdmin()) {
            deletedTypes = roomTypeRepository.findByDeletedAtIsNotNull();
        } else if (isHotelOwner()) {
            deletedTypes = roomTypeRepository.findDeletedRoomTypesByOwner(getCurrentUserEmail());
        } else {
            throw new AccessDeniedException("Bạn không có quyền truy cập trang này");
        }

        return deletedTypes.stream()
                .map(roomTypeMapper::toRoomTypeSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadImportTemplate() {

        try (Workbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("room_types_import");

            CellStyle headerStyle = workbook.createCellStyle();

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);

            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            List<String> headers = List.of(
                    "typeName",
                    "description",
                    "maxAdults",
                    "maxChildren",
                    "bedType",
                    "roomSize",
                    "basePrice",
                    "totalRooms",
                    "isNonSmoking");

            Row headerRow = sheet.createRow(0);

            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            Row sampleRow = sheet.createRow(1);

            sampleRow.createCell(0).setCellValue("Deluxe Twin");
            sampleRow.createCell(1).setCellValue("Phòng đẹp, phù hợp 2 người lớn");
            sampleRow.createCell(2).setCellValue(2);
            sampleRow.createCell(3).setCellValue(1);
            sampleRow.createCell(4).setCellValue("1 giường đôi");
            sampleRow.createCell(5).setCellValue(35.5);
            sampleRow.createCell(6).setCellValue(1200000);
            sampleRow.createCell(7).setCellValue(10);
            sampleRow.createCell(8).setCellValue(true);

            DataValidationHelper helper = sheet.getDataValidationHelper();

            DataValidationConstraint constraint = helper.createExplicitListConstraint(new String[] { "TRUE", "FALSE" });

            CellRangeAddressList addressList = new CellRangeAddressList(1, 1000, 8, 8);

            DataValidation validation = helper.createValidation(constraint, addressList);

            validation.setSuppressDropDownArrow(false);
            validation.setShowErrorBox(true);

            sheet.addValidationData(validation);

            sheet.createFreezePane(0, 1);

            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i), 5000));
            }

            workbook.write(outputStream);

            return outputStream.toByteArray();

        } catch (IOException e) {
            throw new IllegalStateException("Không thể tạo file mẫu Excel", e);
        }
    }

    @Override
    @Transactional
    public RoomTypeImportResponse importRoomTypesFromExcel(Long hotelId, MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn file Excel.");
        }

        String fileName = file.getOriginalFilename();

        if (fileName == null ||
                (!fileName.toLowerCase().endsWith(".xlsx")
                        && !fileName.toLowerCase().endsWith(".xls"))) {

            throw new IllegalArgumentException("Chỉ hỗ trợ file Excel (.xlsx hoặc .xls).");
        }

        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn."));

        checkOwner(hotel.getOwner().getEmail());

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {

            Sheet sheet = workbook.getSheetAt(0);

            if (sheet == null) {
                throw new IllegalArgumentException("File Excel không có dữ liệu.");
            }

            Row headerRow = sheet.getRow(0);

            if (headerRow == null) {
                throw new IllegalArgumentException("Thiếu dòng tiêu đề.");
            }

            Map<String, Integer> headerIndexes = readHeaderIndexes(headerRow);
            validateHeaders(headerIndexes);

            List<String> errors = new ArrayList<>();

            int imported = 0;
            int failed = 0;
            int totalRows = 0;

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {

                Row row = sheet.getRow(i);

                if (isRowEmpty(row)) {
                    continue;
                }

                totalRows++;

                try {

                    RoomTypeRequest request = parseRoomTypeRequest(row, headerIndexes);

                    RoomType roomType = roomTypeMapper.toRoomType(request, hotel);

                    RoomType saved = roomTypeRepository.save(roomType);

                    roomCalendarService.generateCalendarForNewRoomType(saved);

                    imported++;

                } catch (Exception ex) {

                    failed++;

                    errors.add("Dòng " + (i + 1) + ": " + ex.getMessage());
                }
            }

            return RoomTypeImportResponse.builder()
                    .totalRows(totalRows)
                    .importedCount(imported)
                    .failedCount(failed)
                    .errors(errors)
                    .build();

        } catch (IOException e) {

            throw new IllegalStateException("Không thể đọc file Excel.", e);
        }
    }

    private Map<String, Integer> readHeaderIndexes(Row headerRow) {

        Map<String, Integer> indexes = new LinkedHashMap<>();

        for (Cell cell : headerRow) {
            String header = formatter.formatCellValue(cell)
                    .trim()
                    .toLowerCase();
            if (!header.isEmpty()) {
                indexes.put(header, cell.getColumnIndex());
            }
        }
        return indexes;
    }

    private void validateHeaders(Map<String, Integer> headers) {

        List<String> required = List.of(
                "typename",
                "description",
                "maxadults",
                "maxchildren",
                "bedtype",
                "roomsize",
                "baseprice",
                "totalrooms",
                "isnonsmoking");

        for (String item : required) {
            if (!headers.containsKey(item)) {
                throw new IllegalArgumentException("Thiếu cột: " + item);
            }
        }
    }

    private RoomTypeRequest parseRoomTypeRequest(Row row, Map<String, Integer> headerIndexes) {
        String typeName = readRequiredString(row, headerIndexes.get("typename"), "Tên loại phòng");
        String description = readOptionalString(row, headerIndexes.get("description"));
        Integer maxAdults = readRequiredInteger(row, headerIndexes.get("maxadults"), "Số người lớn tối đa");
        Integer maxChildren = readOptionalInteger(row, headerIndexes.get("maxchildren"));
        String bedType = readRequiredString(row, headerIndexes.get("bedtype"), "Loại giường");
        Double roomSize = readOptionalDouble(row, headerIndexes.get("roomsize"));
        BigDecimal basePrice = readRequiredBigDecimal(row, headerIndexes.get("baseprice"), "Giá phòng");
        Integer totalRooms = readRequiredInteger(row, headerIndexes.get("totalrooms"), "Tổng số phòng");
        Boolean isNonSmoking = readRequiredBoolean(row, headerIndexes.get("isnonsmoking"));

        return RoomTypeRequest.builder()
                .hotelId(null)
                .typeName(typeName)
                .description(description)
                .maxAdults(maxAdults)
                .maxChildren(maxChildren)
                .bedType(bedType)
                .roomSize(roomSize)
                .basePrice(basePrice)
                .totalRooms(totalRooms)
                .isNonSmoking(isNonSmoking)
                .build();
    }

    private String readRequiredString(Row row, Integer index, String fieldName) {
        String value = readOptionalString(row, index);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " không được để trống");
        }
        return value.trim();
    }

    private String readOptionalString(Row row, Integer index) {
        if (index == null) {
            return null;
        }
        Cell cell = row.getCell(index);
        if (cell == null) {
            return null;
        }
        return getCellStringValue(cell);
    }

    private Integer readRequiredInteger(Row row, Integer index, String fieldName) {

        String value = readRequiredString(row, index, fieldName);
        try {
            int result = Integer.parseInt(value);
            if (result <= 0) {
                throw new IllegalArgumentException(fieldName + " phải lớn hơn 0");
            }
            return result;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(fieldName + " phải là số nguyên.");
        }
    }

    private Integer readOptionalInteger(Row row, Integer index) {

        String value = readOptionalString(row, index);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value);

        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Số trẻ em phải là số nguyên.");
        }
    }

    private Double readOptionalDouble(Row row, Integer index) {

        String value = readOptionalString(row, index);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            double result = Double.parseDouble(value);
            if (result <= 0) {
                throw new IllegalArgumentException("Diện tích phòng phải lớn hơn 0.");
            }
            return result;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Diện tích phòng phải là số.");
        }
    }

    private BigDecimal readRequiredBigDecimal(Row row,
            Integer index,
            String fieldName) {

        String value = readRequiredString(row, index, fieldName);

        try {
            BigDecimal result = new BigDecimal(value);
            if (result.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException(fieldName + " phải lớn hơn 0");
            }
            return result;

        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(fieldName + " không hợp lệ.");
        }
    }

    private Boolean readRequiredBoolean(Row row, Integer index) {
        String value = readOptionalString(row, index);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Trạng thái hút thuốc không được để trống");
        }

        String normalized = value.trim().toLowerCase();
        if (List.of("true", "1", "yes", "y", "có", "co").contains(normalized)) {
            return true;
        }
        if (List.of("false", "0", "no", "n", "không", "khong").contains(normalized)) {
            return false;
        }
        throw new IllegalArgumentException("isNonSmoking phải là true/false hoặc yes/no");
    }

    private String getCellStringValue(Cell cell) {

        if (cell == null) {
            return null;
        }

        return formatter.formatCellValue(cell).trim();
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        for (Cell cell : row) {
            if (!formatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }
}