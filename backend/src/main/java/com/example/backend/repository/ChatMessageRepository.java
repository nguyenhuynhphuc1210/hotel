package com.example.backend.repository;

import com.example.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    // Lấy toàn bộ tin nhắn của một phòng chat, sắp xếp từ cũ đến mới để hiển thị lên màn hình
    List<ChatMessage> findByConversation_IdOrderByTimestampAsc(Long conversationId);
}