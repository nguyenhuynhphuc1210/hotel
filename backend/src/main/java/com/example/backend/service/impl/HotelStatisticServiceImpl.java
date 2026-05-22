package com.example.backend.service.impl;

import com.example.backend.dto.export.RevenueExport;
import com.example.backend.dto.request.HotelStatisticRequest;
import com.example.backend.dto.response.DailyStatisticResponse;
import com.example.backend.dto.response.DashboardResponse;
import com.example.backend.dto.response.DashboardSummaryResponse;
import com.example.backend.dto.response.HotelStatisticResponse;
import com.example.backend.dto.response.HotelStatisticSummaryResponse;
import com.example.backend.dto.response.RecentBookingResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelStatistic;
import com.example.backend.enums.BookingStatus;
import com.example.backend.mapper.HotelStatisticMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.HotelStatisticRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.HotelStatisticService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class HotelStatisticServiceImpl implements HotelStatisticService {

        private final HotelStatisticRepository hotelStatisticRepository;
        private final HotelRepository hotelRepository;
        private final UserRepository userRepository;
        private final BookingRepository bookingRepository;
        private final HotelStatisticMapper statisticMapper;

        @Override
        @Transactional(readOnly = true)
        public List<HotelStatisticResponse> getStatistics(
                        HotelStatisticRequest request) {

                Hotel hotel = hotelRepository.findById(request.getHotelId())
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Không tìm thấy khách sạn"));

                SecurityUtils.checkOwnerOrAdmin(
                                hotel.getOwner().getEmail());

                if (request.getFromDate() != null
                                && request.getToDate() != null
                                && request.getFromDate().isAfter(request.getToDate())) {

                        throw new IllegalArgumentException(
                                        "Ngày bắt đầu không thể sau ngày kết thúc");
                }

                List<HotelStatistic> stats = hotelStatisticRepository.searchStatistics(
                                request.getHotelId(),
                                request.getDay(),
                                request.getMonth(),
                                request.getYear(),
                                request.getFromDate(),
                                request.getToDate());

                return stats.stream()
                                .map(statisticMapper::toHotelStatisticResponse)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public byte[] exportRevenueToExcel(
                        Long hotelId, Long ownerId, Integer month, Integer year,
                        LocalDate fromDate, LocalDate toDate) throws IOException {

                String currentOwnerEmail = null;

                if (SecurityUtils.isHotelOwner() && !SecurityUtils.isAdmin()) {
                        currentOwnerEmail = SecurityUtils.getCurrentUserEmail();
                }

                List<RevenueExport> statistics = hotelStatisticRepository.exportRevenue(
                                hotelId, ownerId, currentOwnerEmail, month, year, fromDate, toDate);

                Workbook workbook = new XSSFWorkbook();
                Sheet sheet = workbook.createSheet("Revenue Report");

                Font boldFont = workbook.createFont();
                boldFont.setBold(true);

                DataFormat format = workbook.createDataFormat();
                short moneyFormat = format.getFormat("#,##0");

                CellStyle headerStyle = workbook.createCellStyle();
                headerStyle.setFont(boldFont);
                headerStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
                headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                headerStyle.setAlignment(HorizontalAlignment.CENTER);
                headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                setBorders(headerStyle);

                CellStyle textStyle = workbook.createCellStyle();
                textStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                setBorders(textStyle);

                CellStyle centerStyle = workbook.createCellStyle();
                centerStyle.setAlignment(HorizontalAlignment.CENTER);
                centerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                setBorders(centerStyle);

                CellStyle moneyStyle = workbook.createCellStyle();
                moneyStyle.setDataFormat(moneyFormat);
                moneyStyle.setAlignment(HorizontalAlignment.RIGHT);
                moneyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                setBorders(moneyStyle);

                CellStyle totalLabelStyle = workbook.createCellStyle();
                totalLabelStyle.cloneStyleFrom(centerStyle);
                totalLabelStyle.setFont(boldFont);
                totalLabelStyle.setAlignment(HorizontalAlignment.RIGHT);
                totalLabelStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
                totalLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                CellStyle totalCenterStyle = workbook.createCellStyle();
                totalCenterStyle.cloneStyleFrom(centerStyle);
                totalCenterStyle.setFont(boldFont);
                totalCenterStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
                totalCenterStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                CellStyle totalMoneyStyle = workbook.createCellStyle();
                totalMoneyStyle.cloneStyleFrom(moneyStyle);
                totalMoneyStyle.setFont(boldFont);
                totalMoneyStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
                totalMoneyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                String[] columns = {
                                "Hotel Name", "Date", "Completed", "Cancelled", "No Show", "Revenue (VND)"
                };

                Row headerRow = sheet.createRow(0);
                headerRow.setHeightInPoints(20);

                for (int i = 0; i < columns.length; i++) {
                        Cell cell = headerRow.createCell(i);
                        cell.setCellValue(columns[i]);
                        cell.setCellStyle(headerStyle);
                }

                int rowNum = 1;

                long totalCompleted = 0L;
                long totalCancelled = 0L;
                long totalNoShow = 0L;
                BigDecimal totalRevenue = BigDecimal.ZERO;

                for (RevenueExport item : statistics) {
                        Row row = sheet.createRow(rowNum++);

                        row.createCell(0).setCellValue(item.getHotelName());
                        row.getCell(0).setCellStyle(textStyle);

                        row.createCell(1).setCellValue(item.getStatDate().toString());
                        row.getCell(1).setCellStyle(centerStyle);

                        row.createCell(2).setCellValue(
                                        item.getCompletedBookings() != null ? item.getCompletedBookings() : 0);
                        row.getCell(2).setCellStyle(centerStyle);

                        row.createCell(3).setCellValue(item.getTotalCancelled() != null ? item.getTotalCancelled() : 0);
                        row.getCell(3).setCellStyle(centerStyle);

                        row.createCell(4).setCellValue(item.getTotalNoShow() != null ? item.getTotalNoShow() : 0);
                        row.getCell(4).setCellStyle(centerStyle);

                        row.createCell(5).setCellValue(
                                        item.getTotalRevenue() != null ? item.getTotalRevenue().doubleValue() : 0);
                        row.getCell(5).setCellStyle(moneyStyle);

                        totalCompleted += (item.getCompletedBookings() != null ? item.getCompletedBookings() : 0);
                        totalCancelled += (item.getTotalCancelled() != null ? item.getTotalCancelled() : 0);
                        totalNoShow += (item.getTotalNoShow() != null ? item.getTotalNoShow() : 0);
                        totalRevenue = totalRevenue
                                        .add(item.getTotalRevenue() != null ? item.getTotalRevenue() : BigDecimal.ZERO);
                }


                Row totalRow = sheet.createRow(rowNum);
                totalRow.setHeightInPoints(20);

                for (int i = 0; i <= 1; i++) {
                        Cell cell = totalRow.createCell(i);
                        cell.setCellStyle(totalLabelStyle);
                        if (i == 0)
                                cell.setCellValue("TOTAL:");
                }

                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum, rowNum, 0, 1));

                Cell totalCompletedCell = totalRow.createCell(2);
                totalCompletedCell.setCellValue(totalCompleted);
                totalCompletedCell.setCellStyle(totalCenterStyle);

                Cell totalCancelledCell = totalRow.createCell(3);
                totalCancelledCell.setCellValue(totalCancelled);
                totalCancelledCell.setCellStyle(totalCenterStyle);

                Cell totalNoShowCell = totalRow.createCell(4);
                totalNoShowCell.setCellValue(totalNoShow);
                totalNoShowCell.setCellStyle(totalCenterStyle);

                Cell totalValueCell = totalRow.createCell(5);
                totalValueCell.setCellValue(totalRevenue.doubleValue());
                totalValueCell.setCellStyle(totalMoneyStyle);

                for (int i = 0; i < columns.length; i++) {
                        sheet.autoSizeColumn(i);
                        int currentWidth = sheet.getColumnWidth(i);
                        sheet.setColumnWidth(i, currentWidth + 1000);
                }

                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                workbook.write(outputStream);
                workbook.close();

                return outputStream.toByteArray();
        }

        private void setBorders(CellStyle style) {
                style.setBorderBottom(BorderStyle.THIN);
                style.setBorderTop(BorderStyle.THIN);
                style.setBorderLeft(BorderStyle.THIN);
                style.setBorderRight(BorderStyle.THIN);
        }

        @Override
        @Transactional
        public void recordRealtimeStatistic(Hotel hotel, BigDecimal totalAmount, LocalDate date, BookingStatus status) {
                int updatedRows = 0;

                switch (status) {
                        case COMPLETED:
                                updatedRows = hotelStatisticRepository.incrementSuccessfulBooking(hotel.getId(), date,
                                                totalAmount);
                                break;
                        case CANCELLED:
                                updatedRows = hotelStatisticRepository.incrementCancelledBooking(hotel.getId(), date);
                                break;
                        case NO_SHOW:
                                updatedRows = hotelStatisticRepository.incrementNoShowBooking(hotel.getId(), date);
                                break;
                        default:
                                log.info("Bỏ qua thống kê cho trạng thái: {}", status);
                                return;
                }

                if (updatedRows == 0) {
                        try {
                                HotelStatistic newStat = HotelStatistic.builder()
                                                .hotel(hotel)
                                                .statDate(date)
                                                .completedBookings(status == BookingStatus.COMPLETED ? 1 : 0)
                                                .totalRevenue(status == BookingStatus.COMPLETED ? totalAmount
                                                                : BigDecimal.ZERO)
                                                .totalCancelled(status == BookingStatus.CANCELLED ? 1 : 0)
                                                .totalNoShow(status == BookingStatus.NO_SHOW ? 1 : 0)
                                                .build();

                                hotelStatisticRepository.save(newStat);

                        } catch (DataIntegrityViolationException e) {
                                log.warn("Phát hiện xung đột luồng khi tạo HotelStatistic, đang thực hiện lại...");
                                recordRealtimeStatistic(hotel, totalAmount, date, status);
                        }
                }
        }

        @Override
        @Transactional(readOnly = true)
        public DashboardResponse getDashboardData(Long hotelId, Long ownerId, Integer month, Integer year,
                        LocalDate fromDate, LocalDate toDate) {

                boolean isAdmin = SecurityUtils.isAdmin();
                String currentOwnerEmail = isAdmin ? null : SecurityUtils.getCurrentUserEmail();

                if (!isAdmin && !SecurityUtils.isHotelOwner()) {
                        throw new AccessDeniedException("Bạn không có quyền truy cập");
                }

                List<HotelStatisticSummaryResponse> allHotels = hotelStatisticRepository.getHotelsSummary(
                                hotelId, ownerId, currentOwnerEmail, month, year, fromDate, toDate);

                List<DailyStatisticResponse> chartData = hotelStatisticRepository.getDailyChartData(
                                currentOwnerEmail, ownerId, hotelId, month, year, fromDate, toDate);

                long completedBookings = 0L;
                long totalCancelled = 0L;
                long totalNoShow = 0L;
                BigDecimal totalRevenue = BigDecimal.ZERO;

                for (HotelStatisticSummaryResponse hotel : allHotels) {
                        completedBookings += (hotel.getCompletedBookings() != null ? hotel.getCompletedBookings() : 0);
                        totalCancelled += (hotel.getTotalCancelled() != null ? hotel.getTotalCancelled() : 0);
                        totalNoShow += (hotel.getTotalNoShow() != null ? hotel.getTotalNoShow() : 0);
                        totalRevenue = totalRevenue.add(
                                        hotel.getTotalRevenue() != null ? hotel.getTotalRevenue() : BigDecimal.ZERO);
                }

                DashboardSummaryResponse summary = DashboardSummaryResponse.builder()
                                .completedBookings(completedBookings)
                                .totalCancelled(totalCancelled)
                                .totalNoShow(totalNoShow)
                                .totalRevenue(totalRevenue)
                                .build();

                List<HotelStatisticSummaryResponse> displayHotels;
                if (isAdmin && ownerId == null) {
                        displayHotels = allHotels.stream().limit(5).collect(Collectors.toList());
                } else {
                        displayHotels = allHotels;
                }

                Long totalHotels = null;
                Long totalUsers = null;
                Long totalBookings = null;

                if (isAdmin) {

                        totalHotels = hotelRepository.count();
                        totalUsers = userRepository.count();
                        totalBookings = bookingRepository.count();
                }

                List<RecentBookingResponse> recentBookings = bookingRepository.getRecentBookingsForDashboard(
                                currentOwnerEmail, ownerId, hotelId);

                return DashboardResponse.builder()
                                .summary(summary)
                                .totalHotels(totalHotels)
                                .totalUsers(totalUsers)
                                .totalBookings(totalBookings)
                                .chartData(chartData)
                                .topHotels(displayHotels)
                                .recentBookings(recentBookings)
                                .build();
        }
}