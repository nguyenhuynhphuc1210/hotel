package com.example.backend.repository;

import com.example.backend.entity.Hotel;
import com.example.backend.entity.HotelStatistic;
import java.util.List;

import java.time.LocalDate;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelStatisticRepository extends JpaRepository<HotelStatistic, Long> {
    List<HotelStatistic> findByHotel(Hotel hotel);

    List<HotelStatistic> findByHotelAndStatDateBetween(
            Hotel hotel,
            LocalDate fromDate,
            LocalDate toDate);
}