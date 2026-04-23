'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Loader2, Search, Clock, CheckCheck, Wifi, WifiOff } from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import { useAuthStore } from '@/store/authStore'
import { useOwnerHotel } from '../../owner-hotel-context'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

interface ConversationResponse {
    id: number
    hotelId: number
    hotelName: string
    userId: number
    userFullName: string
    userEmail: string
    userAvatar?: string | null
    lastMessageAt: string
}

interface ChatMsg {
    id: number
    conversationId: number
    senderEmail: string
    content: string
    timestamp: string
}

function timeAgo(ts: string) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} giờ trước`
    return new Date(ts).toLocaleDateString('vi-VN')
}

function fmt(ts: string) {
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function initials(name: string) {
    if (!name) return 'U'
    return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080/ws/chat'

export default function OwnerMessagesPage() {
    const { user, token } = useAuthStore()
    const { activeHotelId } = useOwnerHotel()
    const qc = useQueryClient()

    const [selectedConv, setSelectedConv] = useState<ConversationResponse | null>(null)
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [inputText, setInputText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    // ✅ Track conversations có tin nhắn mới chưa đọc (khi đang xem conversation khác)
    const [unreadConvIds, setUnreadConvIds] = useState<Set<number>>(new Set())

    const stompClientRef = useRef<Client | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // ✅ Refs để WebSocket handler luôn đọc được state mới nhất (tránh stale closure)
    const selectedConvRef = useRef<ConversationResponse | null>(null)
    selectedConvRef.current = selectedConv

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ── Fetch inbox ───────────────────────────────────────────────────────
    const { data: conversations = [] } = useQuery({
        queryKey: ['owner-hotel-inbox', activeHotelId],
        queryFn: () =>
            axiosInstance
                .get<ConversationResponse[]>(`/api/chat/hotel-inbox/${activeHotelId}`)
                .then(r => r.data),
        enabled: !!activeHotelId,
        refetchInterval: 30000,
    })

    // ── WebSocket — kết nối 1 lần ─────────────────────────────────────────
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
                    const current = selectedConvRef.current

                    if (current && msg.conversationId === current.id) {
                        // ✅ Đang xem đúng conversation → cập nhật real-time ngay
                        setMessages(prev => {
                            // Replace optimistic (id âm) cùng content + senderEmail
                            const optIdx = prev.findIndex(
                                m => m.id < 0 &&
                                    m.senderEmail === msg.senderEmail &&
                                    m.content === msg.content
                            )
                            if (optIdx !== -1) {
                                const next = [...prev]
                                next[optIdx] = msg
                                return next
                            }
                            if (prev.some(m => m.id === msg.id)) return prev
                            return [...prev, msg]
                        })
                    } else {
                        // ✅ Tin đến từ conversation khác → đánh dấu unread
                        setUnreadConvIds(prev => new Set(prev).add(msg.conversationId))
                    }

                    // ✅ Luôn refresh inbox để cập nhật lastMessageAt + sắp xếp lại
                    qc.invalidateQueries({ queryKey: ['owner-hotel-inbox', activeHotelId] })
                })
            },
            onDisconnect: () => setIsConnected(false),
            onStompError: (f) => {
                console.error('STOMP error', f)
                setIsConnected(false)
            },
        })

        client.activate()
        stompClientRef.current = client
        return () => { client.deactivate() }
    }, [user, token, activeHotelId, qc])

    // ── Chọn conversation → load lịch sử ─────────────────────────────────
    const loadMessages = useCallback(async (conv: ConversationResponse) => {
        setSelectedConv(conv)
        setIsLoadingMsgs(true)
        setMessages([])
        // Xóa unread badge khi mở conversation
        setUnreadConvIds(prev => {
            const next = new Set(prev)
            next.delete(conv.id)
            return next
        })
        try {
            const res = await axiosInstance.get<ChatMsg[]>(`/api/chat/history/${conv.id}`)
            setMessages(res.data)
        } catch {
            setMessages([])
        } finally {
            setIsLoadingMsgs(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [])

    // ── Gửi tin ───────────────────────────────────────────────────────────
    const handleSend = () => {
        if (!inputText.trim() || !user || !selectedConv || isSending || !stompClientRef.current?.connected) return

        const content = inputText.trim()
        setInputText('')
        setIsSending(true)

        const tempId = -(Date.now())
        setMessages(prev => [...prev, {
            id: tempId,
            conversationId: selectedConv.id,
            senderEmail: user.email,
            content,
            timestamp: new Date().toISOString(),
        }])

        try {
            stompClientRef.current!.publish({
                destination: '/app/chat.send',
                body: JSON.stringify({
                    userId: selectedConv.userId,
                    hotelId: selectedConv.hotelId,
                    content,
                    // ✅ receiverEmail là user đang được reply — backend sẽ push cho họ
                    receiverEmail: selectedConv.userEmail,
                }),
            })
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setInputText(content)
        } finally {
            setIsSending(false)
        }
    }

    const filtered = conversations.filter(c =>
        (c.userFullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.userEmail ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div
            className="flex rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm"
            style={{ height: 'calc(100vh - 7rem)' }}
        >
            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
                <div className="px-4 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-900">Tin nhắn</h2>
                        <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full ${isConnected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                            {isConnected ? 'Trực tuyến' : 'Ngoại tuyến'}
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm khách hàng..."
                            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                            <MessageSquare size={28} className="text-gray-200" />
                            <p className="text-sm text-gray-400">Chưa có tin nhắn nào</p>
                        </div>
                    ) : (
                        filtered.map(conv => {
                            const isActive = selectedConv?.id === conv.id
                            const hasUnread = unreadConvIds.has(conv.id)
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => loadMessages(conv)}
                                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-b border-gray-50 transition-colors ${isActive
                                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                        : 'hover:bg-white'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                        {conv.userAvatar
                                            ? <img src={conv.userAvatar} alt={conv.userFullName} className="w-full h-full object-cover" />
                                            : initials(conv.userFullName)
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-sm truncate ${isActive ? 'text-blue-700 font-semibold' : hasUnread ? 'text-gray-900 font-bold' : 'text-gray-900 font-semibold'}`}>
                                                {conv.userFullName}
                                            </span>
                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                                {/* ✅ Unread badge real-time */}
                                                {hasUnread && !isActive && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                                )}
                                                <span className="text-[10px] text-gray-400">
                                                    {timeAgo(conv.lastMessageAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{conv.userEmail}</p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ── Chat Area ────────────────────────────────────────────── */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="h-[65px] border-b border-gray-100 px-5 flex items-center gap-3 shrink-0 bg-white">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0 overflow-hidden">
                            {selectedConv.userAvatar
                                ? <img src={selectedConv.userAvatar} alt={selectedConv.userFullName} className="w-full h-full object-cover" />
                                : initials(selectedConv.userFullName)
                            }
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{selectedConv.userFullName}</p>
                            <p className="text-xs text-gray-400">{selectedConv.userEmail}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                            <Clock size={12} />
                            {timeAgo(selectedConv.lastMessageAt)}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50/40">
                        {isLoadingMsgs ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 size={24} className="animate-spin text-blue-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                                <MessageSquare size={32} className="text-gray-200" />
                                <p className="text-sm text-gray-400">Chưa có tin nhắn nào.</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMine = msg.senderEmail === user?.email
                                const isOptimistic = msg.id < 0
                                return (
                                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        {!isMine && (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0 mr-2 mt-auto mb-5 overflow-hidden">
                                                {selectedConv.userAvatar
                                                    ? <img src={selectedConv.userAvatar} alt="" className="w-full h-full object-cover" />
                                                    : initials(selectedConv.userFullName)
                                                }
                                            </div>
                                        )}
                                        <div className={`max-w-[65%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity ${isOptimistic ? 'opacity-60' : 'opacity-100'} ${isMine
                                                ? 'bg-blue-600 text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <div className={`flex items-center gap-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[10px] text-gray-400">{fmt(msg.timestamp)}</span>
                                                {isMine && !isOptimistic && <CheckCheck size={11} className="text-blue-400" />}
                                                {isMine && isOptimistic && <Loader2 size={10} className="text-gray-300 animate-spin" />}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shrink-0">
                        <input
                            ref={inputRef}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            placeholder={`Trả lời ${selectedConv.userFullName}...`}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim() || isSending || !isConnected}
                            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                        >
                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center bg-gray-50/30">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                        <MessageSquare size={36} className="text-blue-300" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-600 text-base">Chọn một cuộc trò chuyện</p>
                        <p className="text-sm text-gray-400 mt-1">Chọn khách hàng bên trái để xem và phản hồi</p>
                    </div>
                    {!isConnected && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-sm text-amber-700">
                            <WifiOff size={14} />
                            WebSocket chưa kết nối — realtime không hoạt động
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}