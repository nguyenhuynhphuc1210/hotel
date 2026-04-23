package com.example.backend.repository;

import com.example.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByConversation_IdOrderByTimestampAsc(Long conversationId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.conversation.id = :conversationId AND m.senderEmail != :readerEmail AND m.isRead = false")
    void markMessagesAsRead(@Param("conversationId") Long conversationId, @Param("readerEmail") String readerEmail);
}