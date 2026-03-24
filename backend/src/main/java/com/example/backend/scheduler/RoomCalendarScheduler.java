package com.example.backend.scheduler;

import com.example.backend.entity.RoomCalendar;
import com.example.backend.entity.RoomType;
import com.example.backend.repository.RoomCalendarRepository;
import com.example.backend.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RoomCalendarScheduler {

    private final RoomTypeRepository roomTypeRepository;
    private final RoomCalendarRepository roomCalendarRepository;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void extendRoomCalendarsDaily() {
        log.info("Bắt đầu chạy tác vụ: Tự động mở rộng lịch phòng...");
        
        LocalDate targetDate = LocalDate.now().plusYears(1);

        List<RoomType> allRoomTypes = roomTypeRepository.findAll();
        List<RoomCalendar> newCalendarsToSave = new ArrayList<>();

        for (RoomType roomType : allRoomTypes) {
            boolean isCalendarExists = roomCalendarRepository
                    .findByRoomType_IdAndDate(roomType.getId(), targetDate)
                    .isPresent();

            if (!isCalendarExists) {
                RoomCalendar newCalendar = RoomCalendar.builder()
                        .roomType(roomType)
                        .date(targetDate)
                        .price(roomType.getBasePrice())
                        .totalRooms(roomType.getTotalRooms())
                        .bookedRooms(0)
                        .isAvailable(true)
                        .build();
                        
                newCalendarsToSave.add(newCalendar);
            }
        }

        if (!newCalendarsToSave.isEmpty()) {
            roomCalendarRepository.saveAll(newCalendarsToSave);
            log.info("Hoàn tất! Đã tạo thêm {} bản ghi lịch phòng cho ngày {}", newCalendarsToSave.size(), targetDate);
        } else {
            log.info("Hoàn tất! Tất cả các loại phòng đều đã có sẵn lịch cho ngày {}. Không cần tạo thêm.", targetDate);
        }
    }
}