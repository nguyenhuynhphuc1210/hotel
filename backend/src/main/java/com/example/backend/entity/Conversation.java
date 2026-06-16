package com.example.backend.entity;

import com.example.backend.enums.ConversationType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "conversations", indexes = {
        @Index(name = "idx_conv_user_time", columnList = "user_id, last_message_at"),
        @Index(name = "idx_conv_hotel_time", columnList = "hotel_id, last_message_at"),
        @Index(name = "idx_conv_user_hotel", columnList = "user_id, hotel_id"),
        @Index(name = "idx_conv_booking", columnList = "booking_id"),
        @Index(name = "idx_conv_type", columnList = "conversation_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "conversation_type")
    @Builder.Default
    private ConversationType type = ConversationType.USER_HOTEL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Builder.Default
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChatMessage> messages = new ArrayList<>();
}