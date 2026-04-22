package com.example.backend.config;

import com.example.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService; // Dùng Service load User có sẵn của bạn

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Cổng này để Next.js gọi hàm connect()
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("*") // Cho phép mọi domain kết nối
                .withSockJS(); // Tự động fallback nếu mạng của khách bị lỗi WebSocket
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/user"); // Tiền tố để Frontend lắng nghe tin nhắn đến
        registry.setApplicationDestinationPrefixes("/app"); // Tiền tố để Frontend gửi tin nhắn đi
        registry.setUserDestinationPrefix("/user"); // Định tuyến chat cá nhân (1-1)
    }

    // 🔥 BỘ CHẶN CỬA: Kiểm tra JWT Token khi bắt đầu kết nối (Handshake)
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                // Chỉ kiểm tra Token ở lần kết nối đầu tiên (CONNECT)
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    
                    if (authorization != null && !authorization.isEmpty()) {
                        String token = authorization.get(0).substring(7); // Bỏ chữ "Bearer "
                        
                        if (jwtTokenProvider.validateToken(token)) {
                            String email = jwtTokenProvider.getEmailFromJWT(token);
                            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                            
                            // Xác thực thành công -> Gắn thẻ chứng minh nhân dân (Principal) vào đường ống
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(auth);
                        } else {
                            log.error("Token WebSocket không hợp lệ!");
                        }
                    }
                }
                return message;
            }
        });
    }
}