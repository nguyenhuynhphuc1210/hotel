package com.example.backend.repository;

import com.example.backend.entity.RoomCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomCalendarRepository extends JpaRepository<RoomCalendar, Long> {
}