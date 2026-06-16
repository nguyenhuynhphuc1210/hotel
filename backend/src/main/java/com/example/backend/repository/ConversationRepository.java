package com.example.backend.repository;

import com.example.backend.entity.Conversation;
import com.example.backend.enums.ConversationType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByUser_IdAndHotel_IdAndBookingIsNull(Long userId, Long hotelId);

    Optional<Conversation> findByBooking_Id(Long bookingId);

    List<Conversation> findByUser_IdOrderByLastMessageAtDesc(Long userId);

    List<Conversation> findByHotel_IdOrderByLastMessageAtDesc(Long hotelId);

    Optional<Conversation> findByUser_IdAndType(Long userId, ConversationType type);

    Optional<Conversation> findByHotel_IdAndType(Long hotelId, ConversationType type);

    List<Conversation> findByTypeOrderByLastMessageAtDesc(ConversationType type);

    List<Conversation> findByTypeInOrderByLastMessageAtDesc(List<ConversationType> types);
}