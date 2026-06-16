package com.example.backend.service.impl;

import com.example.backend.dto.response.ChatMessageResponse;
import com.example.backend.dto.response.ConversationResponse;
import com.example.backend.entity.Booking;
import com.example.backend.entity.ChatMessage;
import com.example.backend.entity.Conversation;
import com.example.backend.entity.Hotel;
import com.example.backend.entity.User;
import com.example.backend.enums.ConversationType;
import com.example.backend.mapper.ChatMapper;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.ConversationRepository;
import com.example.backend.repository.HotelRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.ChatService;
import com.example.backend.service.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

        private final ConversationRepository conversationRepository;
        private final ChatMessageRepository chatMessageRepository;
        private final UserRepository userRepository;
        private final HotelRepository hotelRepository;
        private final ChatMapper chatMapper;
        private final SimpMessagingTemplate messagingTemplate;
        private final BookingRepository bookingRepository;
        private final NotificationService notificationService;

        @Value("${app.seed.admin.email}")
        private String adminEmail;

        @Override
        @Transactional
        public ChatMessageResponse saveMessage(Long userId, Long hotelId, Long bookingId, String senderEmail,
                        String content, ConversationType type) {

                Conversation conversation;

                final ConversationType finalType = (type == null) ? ConversationType.USER_HOTEL : type;

                if (finalType == ConversationType.USER_ADMIN) {
                        conversation = conversationRepository.findByUser_IdAndType(userId, finalType)
                                        .orElseGet(() -> {
                                                User user = userRepository.findById(userId)
                                                                .orElseThrow(() -> new EntityNotFoundException(
                                                                                "Không tìm thấy User"));
                                                Conversation newConv = Conversation.builder()
                                                                .user(user)
                                                                .type(finalType)
                                                                .build();
                                                return conversationRepository.save(newConv);
                                        });

                } else if (finalType == ConversationType.HOTEL_ADMIN) {
                        conversation = conversationRepository.findByHotel_IdAndType(hotelId, finalType)
                                        .orElseGet(() -> {
                                                Hotel hotel = hotelRepository.findById(hotelId)
                                                                .orElseThrow(() -> new EntityNotFoundException(
                                                                                "Không tìm thấy Hotel"));
                                                Conversation newConv = Conversation.builder()
                                                                .hotel(hotel)
                                                                .type(finalType)
                                                                .build();
                                                return conversationRepository.save(newConv);
                                        });

                } else {

                        if (bookingId != null) {
                                conversation = conversationRepository.findByBooking_Id(bookingId)
                                                .orElseGet(() -> {
                                                        User user = userRepository.findById(userId)
                                                                        .orElseThrow(() -> new EntityNotFoundException(
                                                                                        "Không tìm thấy User"));
                                                        Hotel hotel = hotelRepository.findById(hotelId)
                                                                        .orElseThrow(() -> new EntityNotFoundException(
                                                                                        "Không tìm thấy Hotel"));
                                                        Booking booking = bookingRepository.findById(bookingId)
                                                                        .orElseThrow(() -> new EntityNotFoundException(
                                                                                        "Không tìm thấy Booking"));

                                                        Conversation newConv = Conversation.builder()
                                                                        .user(user)
                                                                        .hotel(hotel)
                                                                        .booking(booking)
                                                                        .type(ConversationType.USER_HOTEL)
                                                                        .build();
                                                        return conversationRepository.save(newConv);
                                                });
                        } else {
                                conversation = conversationRepository
                                                .findByUser_IdAndHotel_IdAndBookingIsNull(userId, hotelId)
                                                .orElseGet(() -> {
                                                        User user = userRepository.findById(userId)
                                                                        .orElseThrow(() -> new EntityNotFoundException(
                                                                                        "Không tìm thấy User"));
                                                        Hotel hotel = hotelRepository.findById(hotelId)
                                                                        .orElseThrow(() -> new EntityNotFoundException(
                                                                                        "Không tìm thấy Hotel"));

                                                        Conversation newConv = Conversation.builder()
                                                                        .user(user)
                                                                        .hotel(hotel)
                                                                        .type(ConversationType.USER_HOTEL)
                                                                        .build();
                                                        return conversationRepository.save(newConv);
                                                });
                        }
                }

                conversation.setLastMessageAt(LocalDateTime.now());
                conversationRepository.save(conversation);

                ChatMessage message = ChatMessage.builder()
                                .conversation(conversation)
                                .senderEmail(senderEmail)
                                .content(content)
                                .timestamp(LocalDateTime.now())
                                .isRead(false)
                                .build();

                ChatMessage savedMessage = chatMessageRepository.save(message);

                if (finalType == ConversationType.USER_HOTEL && hotelId != null) {
                        String ownerEmail = hotelRepository.findOwnerEmailByHotelId(hotelId);
                        String userEmail = conversation.getUser().getEmail();
                        String hotelName = conversation.getHotel().getHotelName();

                        if (ownerEmail != null && !senderEmail.equalsIgnoreCase(ownerEmail)) {
                                notificationService.createNotification(
                                                ownerEmail,
                                                "Bạn có tin nhắn mới",
                                                "Khách hàng " + senderEmail + " đã gửi tin nhắn đến khách sạn "
                                                                + hotelName + ".");
                        }

                        if (userEmail != null && !senderEmail.equalsIgnoreCase(userEmail)) {
                                notificationService.createNotification(
                                                userEmail,
                                                "Tin nhắn mới từ " + hotelName,
                                                "Khách sạn " + hotelName + " vừa trả lời tin nhắn của bạn.");
                        }

                } else if (finalType == ConversationType.USER_ADMIN) {
                        String userEmail = conversation.getUser().getEmail();

                        if (!senderEmail.equalsIgnoreCase(adminEmail)) {
                                notificationService.createNotification(
                                                adminEmail,
                                                "Khách hàng cần hỗ trợ",
                                                "Người dùng " + senderEmail + " vừa gửi tin nhắn nhờ hỗ trợ.");
                        }

                        if (userEmail != null && !senderEmail.equalsIgnoreCase(userEmail)) {
                                notificationService.createNotification(
                                                userEmail,
                                                "Phản hồi từ Admin",
                                                "Quản trị viên hệ thống vừa phản hồi tin nhắn của bạn.");
                        }

                } else if (finalType == ConversationType.HOTEL_ADMIN && hotelId != null) {
                        String ownerEmail = hotelRepository.findOwnerEmailByHotelId(hotelId);
                        String hotelName = conversation.getHotel().getHotelName();

                        if (!senderEmail.equalsIgnoreCase(adminEmail)) {
                                notificationService.createNotification(
                                                adminEmail,
                                                "Đối tác khách sạn cần hỗ trợ",
                                                "Chủ khách sạn " + hotelName + " (" + senderEmail
                                                                + ") vừa gửi tin nhắn liên hệ.");
                        }

                        if (ownerEmail != null && !senderEmail.equalsIgnoreCase(ownerEmail)) {
                                notificationService.createNotification(
                                                ownerEmail,
                                                "Phản hồi từ Admin",
                                                "Quản trị viên hệ thống vừa phản hồi yêu cầu của khách sạn " + hotelName
                                                                + ".");
                        }
                }

                return chatMapper.toResponse(savedMessage);
        }

        @Override
        @Transactional(readOnly = true)
        public List<ConversationResponse> getUserInbox(String userEmail) {
                Long userId = userRepository.findIdByEmail(userEmail);
                if (userId == null) {
                        throw new EntityNotFoundException("Không tìm thấy người dùng");
                }

                List<Conversation> inbox = conversationRepository.findByUser_IdOrderByLastMessageAtDesc(userId);
                return chatMapper.toConversationResponseList(inbox);
        }

        @Override
        @Transactional(readOnly = true)
        public List<ConversationResponse> getHotelInbox(Long hotelId, String currentUserEmail) {
                String ownerEmail = hotelRepository.findOwnerEmailByHotelId(hotelId);
                if (ownerEmail == null) {
                        throw new EntityNotFoundException("Không tìm thấy khách sạn");
                }

                SecurityUtils.checkOwnerOrAdmin(ownerEmail);

                List<Conversation> inbox = conversationRepository.findByHotel_IdOrderByLastMessageAtDesc(hotelId);
                return chatMapper.toConversationResponseList(inbox);
        }

        @Override
        @Transactional(readOnly = true)
        public List<ConversationResponse> getAdminInbox() {
                List<Conversation> userAdminInbox = conversationRepository
                                .findByTypeOrderByLastMessageAtDesc(ConversationType.USER_ADMIN);
                List<Conversation> hotelAdminInbox = conversationRepository
                                .findByTypeOrderByLastMessageAtDesc(ConversationType.HOTEL_ADMIN);

                List<Conversation> allAdminInbox = new ArrayList<>();
                allAdminInbox.addAll(userAdminInbox);
                allAdminInbox.addAll(hotelAdminInbox);

                allAdminInbox.sort((c1, c2) -> c2.getLastMessageAt().compareTo(c1.getLastMessageAt()));

                return chatMapper.toConversationResponseList(allAdminInbox);
        }

        @Override
        @Transactional(readOnly = true)
        public List<ChatMessageResponse> getChatHistory(Long conversationId) {
                List<ChatMessage> history = chatMessageRepository
                                .findByConversation_IdOrderByTimestampAsc(conversationId);
                return chatMapper.toResponseList(history);
        }

        @Override
        @Transactional
        public void markAsRead(Long conversationId, String readerEmail, String senderEmail) {

                chatMessageRepository.markMessagesAsRead(conversationId, readerEmail);

                messagingTemplate.convertAndSendToUser(
                                senderEmail,
                                "/queue/read",
                                conversationId);
        }
}