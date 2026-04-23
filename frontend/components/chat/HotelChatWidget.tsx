'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, ChevronDown, Hotel } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/api/axios'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// ── Types ───────────────────────────────────────────────────────────────────
interface ChatMessageResponse {
    id: number
    conversationId: number
    senderEmail: string
    content: string
    timestamp: string
}

interface HotelChatWidgetProps {
    hotelId: number
    hotelName: string
    hotelOwnerEmail?: string  // email của chủ khách sạn để routing tin nhắn
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(timestamp: string) {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HotelChatWidget({ hotelId, hotelName, hotelOwnerEmail }: HotelChatWidgetProps) {
    const { user, token } = useAuthStore()

    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessageResponse[]>([])
    const [inputText, setInputText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [conversationId, setConversationId] = useState<number | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    const stompClientRef = useRef<Client | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Scroll to bottom khi có tin mới
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    // Kết nối WebSocket khi user đăng nhập
    useEffect(() => {
        if (!user || !token) return

        const client = new Client({
            webSocketFactory: () => new SockJS('/ws/chat'),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            onConnect: () => {
                setIsConnected(true)
                // Đăng ký nhận tin nhắn từ server
                client.subscribe(`/user/queue/messages`, (frame) => {
                    const msg: ChatMessageResponse = JSON.parse(frame.body)
                    setMessages(prev => [...prev, msg])
                    if (!isOpen) {
                        setUnreadCount(prev => prev + 1)
                    }
                })
            },
            onDisconnect: () => {
                setIsConnected(false)
            },
            onStompError: () => {
                setIsConnected(false)
            },
        })

        client.activate()
        stompClientRef.current = client

        return () => {
            client.deactivate()
        }
    }, [user, token])

    // Load lịch sử chat khi mở widget
    const loadChatHistory = useCallback(async () => {
        if (!user) return

        // Tìm conversation hiện có từ inbox
        try {
            setIsLoadingHistory(true)
            const inboxRes = await axiosInstance.get<Array<{
                id: number
                hotel: { id: number }
                user: { id: number }
                lastMessageAt: string
            }>>('/api/chat/user-inbox')

            const conv = inboxRes.data.find(c => c.hotel.id === hotelId)

            if (conv) {
                setConversationId(conv.id)
                const historyRes = await axiosInstance.get<ChatMessageResponse[]>(
                    `/api/chat/history/${conv.id}`
                )
                setMessages(historyRes.data)
            } else {
                // Chưa có conversation, bắt đầu mới
                setMessages([])
            }
        } catch {
            // Conversation chưa tồn tại - bình thường
            setMessages([])
        } finally {
            setIsLoadingHistory(false)
        }
    }, [user, hotelId])

    const handleOpen = () => {
        setIsOpen(true)
        setUnreadCount(0)
        if (user && messages.length === 0) {
            loadChatHistory()
        }
        setTimeout(() => inputRef.current?.focus(), 100)
    }

    const handleClose = () => setIsOpen(false)

    // Gửi tin nhắn qua WebSocket
    const handleSend = async () => {
        if (!inputText.trim() || !user || isSending) return
        if (!stompClientRef.current?.connected) return

        const content = inputText.trim()
        setInputText('')
        setIsSending(true)

        // Optimistic UI: thêm tin nhắn ngay
        const optimisticMsg: ChatMessageResponse = {
            id: Date.now(),
            conversationId: conversationId ?? 0,
            senderEmail: user.email,
            content,
            timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])

        try {
            stompClientRef.current.publish({
                destination: '/app/chat.send',
                body: JSON.stringify({
                    userId: user.id,
                    hotelId,
                    content,
                    receiverEmail: hotelOwnerEmail ?? '',
                }),
            })
        } catch {
            // Xóa optimistic nếu lỗi
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
            setInputText(content)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Nếu chưa đăng nhập thì không hiện widget
    if (!user) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
                    style={{ height: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

                    {/* Header */}
                    <div className="bg-blue-600 px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Hotel size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{hotelName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-300' : 'bg-gray-400'}`} />
                                <span className="text-white/70 text-[11px]">
                                    {isConnected ? 'Đang kết nối' : 'Ngoại tuyến'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        >
                            <ChevronDown size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 size={24} className="animate-spin text-blue-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                                    <MessageSquare size={26} className="text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 text-sm">Bắt đầu cuộc trò chuyện</p>
                                    <p className="text-xs text-gray-400 mt-1">Hỏi ngay về phòng, giá, tiện ích...</p>
                                </div>
                                {/* Quick questions */}
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    {[
                                        'Khách sạn còn phòng trống không?',
                                        'Có dịch vụ đón/tiễn sân bay không?',
                                        'Chính sách hủy phòng như thế nào?',
                                    ].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => setInputText(q)}
                                            className="text-left text-xs px-3 py-2 bg-white border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-medium"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMine = msg.senderEmail === user.email
                                return (
                                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        {!isMine && (
                                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mr-2 mt-auto">
                                                KS
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                                isMine
                                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-gray-400 px-1">
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-100 px-3 py-3 bg-white flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim() || isSending || !isConnected}
                            className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            {isSending ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={isOpen ? handleClose : handleOpen}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 relative ${
                    isOpen
                        ? 'bg-gray-700 hover:bg-gray-800'
                        : 'bg-blue-600 hover:bg-blue-700'
                }`}
                style={{ boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
                title={isOpen ? 'Đóng chat' : 'Chat với khách sạn'}
            >
                {isOpen ? (
                    <X size={22} className="text-white" />
                ) : (
                    <MessageSquare size={22} className="text-white" />
                )}

                {/* Unread badge */}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {/* Online indicator */}
                {isConnected && !isOpen && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                )}
            </button>
        </div>
    )
}