'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, ChevronDown, Hotel } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/api/axios'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

interface ChatMsg {
    id: number
    conversationId: number
    senderEmail: string
    content: string
    timestamp: string
    isRead: boolean
}

interface HotelChatWidgetProps {
    hotelId: number
    hotelName: string
    hotelOwnerEmail: string
}

function fmt(ts: string) {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080/ws/chat'

export default function HotelChatWidget({ hotelId, hotelName, hotelOwnerEmail }: HotelChatWidgetProps) {
    const { user, token } = useAuthStore()

    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [inputText, setInputText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    const conversationIdRef = useRef<number | null>(null)
    const stompClientRef = useRef<Client | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const isOpenRef = useRef(false)
    isOpenRef.current = isOpen

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendReadReceipt = useCallback((senderEmail: string, client?: Client) => {
        const stomp = client ?? stompClientRef.current
        if (!stomp?.connected || !conversationIdRef.current) return
        stomp.publish({
            destination: '/app/chat.read',
            body: JSON.stringify({ conversationId: conversationIdRef.current, senderEmail }),
        })
    }, [])

    useEffect(() => {
        if (!user || !token) return

        const client = new Client({
            webSocketFactory: () => new SockJS(SOCKET_URL),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                setIsConnected(true)

                client.subscribe('/user/queue/messages', (frame) => {
                    const msg: ChatMsg = JSON.parse(frame.body)
                    if (msg.conversationId && conversationIdRef.current === null)
                        conversationIdRef.current = msg.conversationId
                    if (msg.conversationId !== conversationIdRef.current) return

                    setMessages(prev => {
                        const idx = prev.findIndex(m => m.id < 0 && m.senderEmail === msg.senderEmail && m.content === msg.content)
                        if (idx !== -1) { const next = [...prev]; next[idx] = msg; return next }
                        if (prev.some(m => m.id === msg.id)) return prev
                        return [...prev, msg]
                    })

                    if (isOpenRef.current && msg.senderEmail !== user.email)
                        sendReadReceipt(msg.senderEmail, client)
                    else if (!isOpenRef.current)
                        setUnreadCount(n => n + 1)
                })

                client.subscribe('/user/queue/read', (frame) => {
                    const conversationId: number = JSON.parse(frame.body)
                    if (conversationId !== conversationIdRef.current) return
                    setMessages(prev => prev.map(m => m.senderEmail === user.email ? { ...m, isRead: true } : m))
                })
            },
            onDisconnect: () => setIsConnected(false),
            onStompError: (f) => { console.error('STOMP error', f); setIsConnected(false) },
        })

        client.activate()
        stompClientRef.current = client
        return () => { client.deactivate() }
    }, [user, token, sendReadReceipt])

    const loadHistory = useCallback(async () => {
        if (!user) return
        setIsLoadingHistory(true)
        try {
            const inboxRes = await axiosInstance.get<Array<{ id: number; hotelId: number }>>('/api/chat/user-inbox')
            const conv = inboxRes.data.find(c => c.hotelId === hotelId)
            if (conv) {
                conversationIdRef.current = conv.id
                const histRes = await axiosInstance.get<ChatMsg[]>(`/api/chat/history/${conv.id}`)
                setMessages(histRes.data)
                const lastOther = [...histRes.data].reverse().find(m => m.senderEmail !== user.email)
                if (lastOther) sendReadReceipt(lastOther.senderEmail)
            } else {
                conversationIdRef.current = null
                setMessages([])
            }
        } catch { setMessages([]) }
        finally { setIsLoadingHistory(false) }
    }, [user, hotelId, sendReadReceipt])

    const handleOpen = () => {
        setIsOpen(true)
        setUnreadCount(0)
        if (user) loadHistory()
        setTimeout(() => inputRef.current?.focus(), 150)
    }

    const handleSend = () => {
        if (!inputText.trim() || !user || isSending || !stompClientRef.current?.connected) return
        const content = inputText.trim()
        setInputText('')
        setIsSending(true)
        const tempId = -(Date.now())
        setMessages(prev => [...prev, {
            id: tempId, conversationId: conversationIdRef.current ?? 0,
            senderEmail: user.email, content, timestamp: new Date().toISOString(), isRead: false,
        }])
        try {
            stompClientRef.current!.publish({
                destination: '/app/chat.send',
                body: JSON.stringify({ userId: user.id, hotelId, content, receiverEmail: hotelOwnerEmail }),
            })
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setInputText(content)
        } finally { setIsSending(false) }
    }

    if (!user) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {isOpen && (
                <div
                    className="w-[360px] bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden"
                    style={{ height: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
                >
                    {/* Header */}
                    <div className="bg-blue-600 px-4 py-3 flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                            <Hotel size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{hotelName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-300' : 'bg-white/40'}`} />
                                <span className="text-white/70 text-[11px]">
                                    {isConnected ? 'Đang kết nối' : 'Ngoại tuyến'}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                            <ChevronDown size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/80">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 size={24} className="animate-spin text-blue-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-2">
                                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                                    <MessageSquare size={26} className="text-blue-500" />
                                </div>
                                <p className="font-semibold text-gray-700 text-sm">Bắt đầu cuộc trò chuyện</p>
                                <div className="flex flex-col gap-2 w-full">
                                    {['Khách sạn còn phòng trống không?', 'Có dịch vụ đưa đón sân bay không?', 'Chính sách hủy phòng như thế nào?'].map(q => (
                                        <button key={q} onClick={() => setInputText(q)}
                                            className="text-left text-xs px-3 py-2 bg-white border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-medium">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMine = msg.senderEmail === user.email
                                const isOptimistic = msg.id < 0
                                return (
                                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        {!isMine && (
                                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-auto mb-4">
                                                KS
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed transition-opacity
                                                ${isOptimistic ? 'opacity-60' : 'opacity-100'}
                                                ${isMine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'}`}>
                                                {msg.content}
                                            </div>
                                            {/* ── Trạng thái đọc dạng chữ ── */}
                                            <div className={`flex items-center gap-1.5 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[10px] text-gray-400">{fmt(msg.timestamp)}</span>
                                                {isMine && (
                                                    isOptimistic
                                                        ? <span className="text-[10px] text-gray-300">Đang gửi...</span>
                                                        : msg.isRead
                                                            ? <span className="text-[10px] text-blue-400 font-medium">Đã xem</span>
                                                            : <span className="text-[10px] text-gray-400">Chưa đọc</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-100 px-3 py-3 bg-white flex items-center gap-2 shrink-0">
                        <input
                            ref={inputRef}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim() || isSending || !isConnected}
                            className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                        >
                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 relative
                    ${isOpen ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                style={{ boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
            >
                {isOpen ? <X size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                {isConnected && !isOpen && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                )}
            </button>
        </div>
    )
}