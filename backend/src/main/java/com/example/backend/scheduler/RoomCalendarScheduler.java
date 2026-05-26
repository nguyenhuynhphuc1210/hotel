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

    @Scheduled(cron = "0 0 2 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void extendRoomCalendarsDaily() {

        LocalDate targetDate = LocalDate.now().plusYears(1);

        List<RoomType> roomTypes = roomTypeRepository.findAll();

        List<RoomCalendar> calendarsToCreate = new ArrayList<>();

        for (RoomType roomType : roomTypes) {

            LocalDate maxDate = roomCalendarRepository.findMaxDateByRoomType(roomType.getId());

            if (maxDate == null) {
                maxDate = LocalDate.now().minusDays(1);
            }

            while (maxDate.isBefore(targetDate)) {

                maxDate = maxDate.plusDays(1);

                RoomCalendar calendar = RoomCalendar.builder()
                        .roomType(roomType)
                        .date(maxDate)
                        .price(roomType.getBasePrice())
                        .totalRooms(roomType.getTotalRooms())
                        .bookedRooms(0)
                        .isAvailable(true)
                        .build();

                calendarsToCreate.add(calendar);
            }
        }

        if (!calendarsToCreate.isEmpty()) {
            roomCalendarRepository.saveAll(calendarsToCreate);

            log.info("Đã tạo {} RoomCalendar",
                    calendarsToCreate.size());
        }
    }
}