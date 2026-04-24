package com.example.backend.repository;

import com.example.backend.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByUser_IdAndHotel_IdAndBookingIsNull(Long userId, Long hotelId);
    
    Optional<Conversation> findByBooking_Id(Long bookingId);

    List<Conversation> findByUser_IdOrderByLastMessageAtDesc(Long userId);

    List<Conversation> findByHotel_IdOrderByLastMessageAtDesc(Long hotelId);
}