package com.example.backend.service;

import com.example.backend.mapper.RoomTypeMapper;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.RoomTypeRepository;
import com.example.backend.service.impl.RoomCalendarServiceImpl;
import com.example.backend.service.impl.RoomTypeServiceImpl;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class RoomTypeServiceImplTest {

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private RoomTypeMapper roomTypeMapper;

    @Mock
    private RoomCalendarServiceImpl roomCalendarService;

    @InjectMocks
    private RoomTypeServiceImpl roomTypeService;

    @Test
    void shouldGenerateTemplateWorkbookWithExpectedHeaders() throws Exception {
        byte[] templateBytes = roomTypeService.downloadImportTemplate();

        assertThat(templateBytes).isNotEmpty();

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(templateBytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getSheetName()).isEqualTo("room_types_import");

            Row headerRow = sheet.getRow(0);
            assertThat(headerRow.getCell(0).getStringCellValue()).isEqualTo("typeName");
            assertThat(headerRow.getCell(1).getStringCellValue()).isEqualTo("description");
            assertThat(headerRow.getCell(2).getStringCellValue()).isEqualTo("maxAdults");
            assertThat(headerRow.getCell(3).getStringCellValue()).isEqualTo("maxChildren");
            assertThat(headerRow.getCell(4).getStringCellValue()).isEqualTo("bedType");
            assertThat(headerRow.getCell(5).getStringCellValue()).isEqualTo("roomSize");
            assertThat(headerRow.getCell(6).getStringCellValue()).isEqualTo("basePrice");
            assertThat(headerRow.getCell(7).getStringCellValue()).isEqualTo("totalRooms");
            assertThat(headerRow.getCell(8).getStringCellValue()).isEqualTo("isNonSmoking");
        }
    }
}
