package com.example.backend.repository;

import com.example.backend.entity.RoomCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomCalendarRepository extends JpaRepository<RoomCalendar, Long> {
    List<RoomCalendar> findByRoomType_Hotel_Owner_Email(String email);
}