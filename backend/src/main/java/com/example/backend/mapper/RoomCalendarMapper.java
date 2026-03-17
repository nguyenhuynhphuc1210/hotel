package com.example.backend.mapper;

import com.example.backend.dto.request.RoomCalendarRequest;
import com.example.backend.dto.response.RoomCalendarResponse;
import com.example.backend.entity.RoomCalendar;
import com.example.backend.entity.RoomType;
import org.springframework.stereotype.Component;

@Component
public class RoomCalendarMapper {
    public RoomCalendar toRoomCalendar(RoomCalendarRequest req, RoomType roomType) {
        if (req == null) return null;
        return RoomCalendar.builder()
                .roomType(roomType)
                .date(req.getDate())
                .price(req.getPrice())
                .totalRooms(req.getTotalRooms())
                .bookedRooms(0)
                .isAvailable(req.getIsAvailable() != null ? req.getIsAvailable() : true)
                .build();
    }

    public RoomCalendarResponse toRoomCalendarResponse(RoomCalendar rc) {
        if (rc == null) return null;
        return RoomCalendarResponse.builder()
                .id(rc.getId())
                .roomTypeId(rc.getRoomType() != null ? rc.getRoomType().getId() : null)
                .roomTypeName(rc.getRoomType() != null ? rc.getRoomType().getTypeName() : null)
                .date(rc.getDate())
                .price(rc.getPrice())
                .totalRooms(rc.getTotalRooms())
                .bookedRooms(rc.getBookedRooms())
                .isAvailable(rc.getIsAvailable())
                .createdAt(rc.getCreatedAt())
                .updatedAt(rc.getUpdatedAt())
                .build();
    }
}
