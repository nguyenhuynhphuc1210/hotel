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
    public List<HotelStatisticResponse> getStatistics(HotelStatisticRequest request) {

        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khách sạn"));

        SecurityUtils.checkOwnerOrAdmin(hotel.getOwner().getEmail());

        if (request.getFromDate() != null
                && request.getToDate() != null
                && request.getFromDate().isAfter(request.getToDate())) {
            throw new IllegalArgumentException("Ngày bắt đầu không thể sau ngày kết thúc");
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

        boolean isAdmin = SecurityUtils.isAdmin();
        String currentOwnerEmail = null;

        if (!isAdmin && SecurityUtils.isHotelOwner()) {
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

        List<String> columnsList = new java.util.ArrayList<>(java.util.Arrays.asList(
                "Tên khách sạn", "Ngày", "Đã hoàn thành", "Đã hủy", "Không đến",
                "Doanh thu gộp", "Hoa hồng"));

        if (isAdmin) {
            columnsList.add("Hệ thống tài trợ");
            columnsList.add("Lợi nhuận nền tảng");
        }
        columnsList.add("Doanh thu ròng");

        String[] columns = columnsList.toArray(new String[0]);

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
        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalCommissionAmount = BigDecimal.ZERO;
        BigDecimal totalSystemSponsor = BigDecimal.ZERO;
        BigDecimal totalPlatformProfit = BigDecimal.ZERO;
        BigDecimal totalNetAmount = BigDecimal.ZERO;

        for (RevenueExport item : statistics) {
            Row row = sheet.createRow(rowNum++);
            int colIdx = 0;

            row.createCell(colIdx).setCellValue(item.getHotelName());
            row.getCell(colIdx++).setCellStyle(textStyle);

            row.createCell(colIdx).setCellValue(item.getStatDate().toString());
            row.getCell(colIdx++).setCellStyle(centerStyle);

            row.createCell(colIdx).setCellValue(item.getCompletedBookings() != null ? item.getCompletedBookings() : 0);
            row.getCell(colIdx++).setCellStyle(centerStyle);

            row.createCell(colIdx).setCellValue(item.getTotalCancelled() != null ? item.getTotalCancelled() : 0);
            row.getCell(colIdx++).setCellStyle(centerStyle);

            row.createCell(colIdx).setCellValue(item.getTotalNoShow() != null ? item.getTotalNoShow() : 0);
            row.getCell(colIdx++).setCellStyle(centerStyle);

            row.createCell(colIdx)
                    .setCellValue(item.getGrossRevenue() != null ? item.getGrossRevenue().doubleValue() : 0);
            row.getCell(colIdx++).setCellStyle(moneyStyle);

            row.createCell(colIdx)
                    .setCellValue(item.getTotalCommission() != null ? item.getTotalCommission().doubleValue() : 0);
            row.getCell(colIdx++).setCellStyle(moneyStyle);

            if (isAdmin) {
                row.createCell(colIdx).setCellValue(
                        item.getSystemSponsorAmount() != null ? item.getSystemSponsorAmount().doubleValue() : 0);
                row.getCell(colIdx++).setCellStyle(moneyStyle);

                row.createCell(colIdx).setCellValue(
                        item.getPlatformNetProfit() != null ? item.getPlatformNetProfit().doubleValue() : 0);
                row.getCell(colIdx++).setCellStyle(moneyStyle);
            }

            row.createCell(colIdx).setCellValue(item.getNetRevenue() != null ? item.getNetRevenue().doubleValue() : 0);
            row.getCell(colIdx++).setCellStyle(moneyStyle);

            totalCompleted += (item.getCompletedBookings() != null ? item.getCompletedBookings() : 0);
            totalCancelled += (item.getTotalCancelled() != null ? item.getTotalCancelled() : 0);
            totalNoShow += (item.getTotalNoShow() != null ? item.getTotalNoShow() : 0);
            totalGross = totalGross.add(item.getGrossRevenue() != null ? item.getGrossRevenue() : BigDecimal.ZERO);
            totalCommissionAmount = totalCommissionAmount
                    .add(item.getTotalCommission() != null ? item.getTotalCommission() : BigDecimal.ZERO);
            totalSystemSponsor = totalSystemSponsor
                    .add(item.getSystemSponsorAmount() != null ? item.getSystemSponsorAmount() : BigDecimal.ZERO);
            totalPlatformProfit = totalPlatformProfit
                    .add(item.getPlatformNetProfit() != null ? item.getPlatformNetProfit() : BigDecimal.ZERO);
            totalNetAmount = totalNetAmount.add(item.getNetRevenue() != null ? item.getNetRevenue() : BigDecimal.ZERO);
        }

        Row totalRow = sheet.createRow(rowNum);
        totalRow.setHeightInPoints(20);

        for (int i = 0; i <= 1; i++) {
            Cell cell = totalRow.createCell(i);
            cell.setCellStyle(totalLabelStyle);
            if (i == 0)
                cell.setCellValue("Tổng:");
        }

        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum, rowNum, 0, 1));

        int totalColIdx = 2;

        Cell totalCompletedCell = totalRow.createCell(totalColIdx);
        totalCompletedCell.setCellValue(totalCompleted);
        totalCompletedCell.setCellStyle(totalCenterStyle);
        totalColIdx++;

        Cell totalCancelledCell = totalRow.createCell(totalColIdx);
        totalCancelledCell.setCellValue(totalCancelled);
        totalCancelledCell.setCellStyle(totalCenterStyle);
        totalColIdx++;

        Cell totalNoShowCell = totalRow.createCell(totalColIdx);
        totalNoShowCell.setCellValue(totalNoShow);
        totalNoShowCell.setCellStyle(totalCenterStyle);
        totalColIdx++;

        Cell totalGrossCell = totalRow.createCell(totalColIdx);
        totalGrossCell.setCellValue(totalGross.doubleValue());
        totalGrossCell.setCellStyle(totalMoneyStyle);
        totalColIdx++;

        Cell totalCommissionCell = totalRow.createCell(totalColIdx);
        totalCommissionCell.setCellValue(totalCommissionAmount.doubleValue());
        totalCommissionCell.setCellStyle(totalMoneyStyle);
        totalColIdx++;

        if (isAdmin) {
            Cell totalSponsorCell = totalRow.createCell(totalColIdx);
            totalSponsorCell.setCellValue(totalSystemSponsor.doubleValue());
            totalSponsorCell.setCellStyle(totalMoneyStyle);
            totalColIdx++;

            Cell totalProfitCell = totalRow.createCell(totalColIdx);
            totalProfitCell.setCellValue(totalPlatformProfit.doubleValue());
            totalProfitCell.setCellStyle(totalMoneyStyle);
            totalColIdx++;
        }

        Cell totalNetCell = totalRow.createCell(totalColIdx);
        totalNetCell.setCellValue(totalNetAmount.doubleValue());
        totalNetCell.setCellStyle(totalMoneyStyle);

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
    public void recordRealtimeStatistic(Hotel hotel, BigDecimal grossAmount, BigDecimal commissionAmount,
            BigDecimal systemSponsorAmount, BigDecimal netAmount, LocalDate date, BookingStatus status) {
        int updatedRows = 0;

        switch (status) {
            case COMPLETED:
                updatedRows = hotelStatisticRepository.incrementSuccessfulBooking(hotel.getId(), date, grossAmount,
                        commissionAmount, systemSponsorAmount, netAmount);
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
                        .grossRevenue(status == BookingStatus.COMPLETED ? grossAmount : BigDecimal.ZERO)
                        .totalCommission(status == BookingStatus.COMPLETED ? commissionAmount : BigDecimal.ZERO)
                        .systemSponsorAmount(status == BookingStatus.COMPLETED ? systemSponsorAmount : BigDecimal.ZERO)
                        .netRevenue(status == BookingStatus.COMPLETED ? netAmount : BigDecimal.ZERO)
                        .totalCancelled(status == BookingStatus.CANCELLED ? 1 : 0)
                        .totalNoShow(status == BookingStatus.NO_SHOW ? 1 : 0)
                        .build();

                hotelStatisticRepository.save(newStat);

            } catch (DataIntegrityViolationException e) {
                log.warn("Phát hiện xung đột luồng khi tạo HotelStatistic, đang thực hiện lại...");
                recordRealtimeStatistic(hotel, grossAmount, commissionAmount, systemSponsorAmount, netAmount, date,
                        status);
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

        List<RecentBookingResponse> recentBookings = bookingRepository.getRecentBookingsForDashboard(
                currentOwnerEmail, ownerId, hotelId);

        DashboardSummaryResponse summary = calculateSummary(allHotels);

        List<HotelStatisticSummaryResponse> displayHotels = (isAdmin && ownerId == null)
                ? allHotels.stream().limit(5).collect(Collectors.toList())
                : allHotels;

        Long totalHotels = isAdmin ? hotelRepository.count() : null;
        Long totalUsers = isAdmin ? userRepository.count() : null;
        Long totalBookings = isAdmin ? bookingRepository.count() : null;

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

    private DashboardSummaryResponse calculateSummary(List<HotelStatisticSummaryResponse> hotels) {
        long completedBookings = 0L;
        long totalCancelled = 0L;
        long totalNoShow = 0L;

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalCommission = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalSystemSponsor = BigDecimal.ZERO;
        BigDecimal totalPlatformProfit = BigDecimal.ZERO;

        for (HotelStatisticSummaryResponse hotel : hotels) {
            completedBookings += (hotel.getCompletedBookings() != null ? hotel.getCompletedBookings() : 0L);
            totalCancelled += (hotel.getTotalCancelled() != null ? hotel.getTotalCancelled() : 0L);
            totalNoShow += (hotel.getTotalNoShow() != null ? hotel.getTotalNoShow() : 0L);

            totalGross = totalGross.add(hotel.getGrossRevenue() != null ? hotel.getGrossRevenue() : BigDecimal.ZERO);
            totalCommission = totalCommission
                    .add(hotel.getTotalCommission() != null ? hotel.getTotalCommission() : BigDecimal.ZERO);
            totalNet = totalNet.add(hotel.getNetRevenue() != null ? hotel.getNetRevenue() : BigDecimal.ZERO);

            totalSystemSponsor = totalSystemSponsor
                    .add(hotel.getSystemSponsorAmount() != null ? hotel.getSystemSponsorAmount() : BigDecimal.ZERO);
            totalPlatformProfit = totalPlatformProfit
                    .add(hotel.getPlatformNetProfit() != null ? hotel.getPlatformNetProfit() : BigDecimal.ZERO);
        }

        return DashboardSummaryResponse.builder()
                .completedBookings(completedBookings)
                .totalCancelled(totalCancelled)
                .totalNoShow(totalNoShow)
                .grossRevenue(totalGross)
                .totalCommission(totalCommission)
                .netRevenue(totalNet)
                .systemSponsorAmount(totalSystemSponsor)
                .platformNetProfit(totalPlatformProfit)
                .build();
    }
}