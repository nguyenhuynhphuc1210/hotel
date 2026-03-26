package com.example.backend.scheduler;

import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelStatistic;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.HotelStatisticRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class StatisticScheduler {

    private final HotelRepository hotelRepository;
    private final BookingRepository bookingRepository;
    private final HotelStatisticRepository statisticRepository;

    @Scheduled(cron = "0 55 23 * * *")
    @Transactional
    public void calculateDailyStatistics() {
        LocalDate today = LocalDate.now();
        log.info("Bắt đầu tổng hợp doanh thu cho ngày: {}", today);

        List<Hotel> allHotels = hotelRepository.findAll();

        for (Hotel hotel : allHotels) {
            Integer totalBookings = bookingRepository.countCompletedBookingsByDateAndHotel(hotel.getId(), today);
            BigDecimal totalRevenue = bookingRepository.sumRevenueByDateAndHotel(hotel.getId(), today);

            if (totalBookings > 0) {
                HotelStatistic stat = statisticRepository.findByHotelIdAndStatDate(hotel.getId(), today)
                        .orElse(new HotelStatistic());

                stat.setHotel(hotel);
                stat.setStatDate(today);
                stat.setTotalBookings(totalBookings);
                stat.setTotalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO);

                statisticRepository.save(stat);
            }
        }
        log.info("Hoàn tất tổng hợp doanh thu ngày.");
    }
}