'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Loader2, Search, Clock, Wifi, WifiOff, Hotel } from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import { useAuthStore } from '@/store/authStore'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// Interface tương ứng với dữ liệu User Inbox
interface UserConversationResponse {
    id: number
    hotelId: number
    hotelName: string
    hotelImage?: string | null
    hotelOwnerEmail: string
    lastMessageAt: string
}

interface ChatMsg {
    id: number
    conversationId: number
    senderEmail: string
    content: string
    timestamp: string
    isRead: boolean
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080/ws/chat'

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

export default function UserMessagesPage() {
    const { user, token } = useAuthStore()
    const qc = useQueryClient()

    const [selectedConv, setSelectedConv] = useState<UserConversationResponse | null>(null)
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [inputText, setInputText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [unreadConvIds, setUnreadConvIds] = useState<Set<number>>(new Set())

    const stompClientRef = useRef<Client | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const selectedConvRef = useRef<UserConversationResponse | null>(null)
    selectedConvRef.current = selectedConv

    // Cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Lấy danh sách inbox của user
    const { data: conversations = [], isLoading: isLoadingInbox } = useQuery({
        queryKey: ['user-chat-inbox'],
        queryFn: () => axiosInstance.get<UserConversationResponse[]>('/api/chat/user-inbox').then(r => r.data),
        enabled: !!user,
    })

    const sendReadReceipt = useCallback((conversationId: number, senderEmail: string, client?: Client) => {
        const stomp = client ?? stompClientRef.current
        if (!stomp?.connected) return
        stomp.publish({
            destination: '/app/chat.read',
            body: JSON.stringify({ conversationId, senderEmail }),
        })
    }, [])

    // WebSocket Connection
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
                        setMessages(prev => {
                            if (prev.some(m => m.id === msg.id)) return prev
                            return [...prev, msg]
                        })
                        if (msg.senderEmail !== user.email)
                            sendReadReceipt(msg.conversationId, msg.senderEmail, client)
                    } else {
                        setUnreadConvIds(prev => new Set(prev).add(msg.conversationId))
                    }
                    qc.invalidateQueries({ queryKey: ['user-chat-inbox'] })
                })

                client.subscribe('/user/queue/read', (frame) => {
                    const conversationId: number = JSON.parse(frame.body)
                    if (selectedConvRef.current?.id === conversationId) {
                        setMessages(prev => prev.map(m => m.senderEmail === user.email ? { ...m, isRead: true } : m))
                    }
                })
            },
            onDisconnect: () => setIsConnected(false),
        })

        client.activate()
        stompClientRef.current = client
        return () => {
    client.deactivate(); 
};
    }, [user, token, qc, sendReadReceipt])

    const loadMessages = useCallback(async (conv: UserConversationResponse) => {
        setSelectedConv(conv)
        setIsLoadingMsgs(true)
        setUnreadConvIds(prev => { const next = new Set(prev); next.delete(conv.id); return next })
        try {
            const res = await axiosInstance.get<ChatMsg[]>(`/api/chat/history/${conv.id}`)
            setMessages(res.data)
            const lastOtherMsg = [...res.data].reverse().find(m => m.senderEmail !== user?.email)
            if (lastOtherMsg) sendReadReceipt(conv.id, lastOtherMsg.senderEmail)
        } catch { setMessages([]) }
        finally { setIsLoadingMsgs(false); setTimeout(() => inputRef.current?.focus(), 100) }
    }, [user, sendReadReceipt])

    const handleSend = () => {
        if (!inputText.trim() || !user || !selectedConv || !stompClientRef.current?.connected) return
        const content = inputText.trim()
        setInputText('')
        setIsSending(true)
        
        const tempId = -Date.now()
        setMessages(prev => [...prev, {
            id: tempId, conversationId: selectedConv.id,
            senderEmail: user.email, content, timestamp: new Date().toISOString(), isRead: false,
        }])

        try {
            stompClientRef.current.publish({
                destination: '/app/chat.send',
                body: JSON.stringify({ 
                    userId: user.id, 
                    hotelId: selectedConv.hotelId, 
                    content, 
                    receiverEmail: selectedConv.hotelOwnerEmail 
                }),
            })
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setInputText(content)
        } finally { setIsSending(false) }
    }

    const filtered = conversations.filter(c => 
        c.hotelName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:flex-row" style={{ height: '700px' }}>
            
            {/* Sidebar: Danh sách khách sạn */}
            <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-gray-900">Trò chuyện</h2>
                        <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {isConnected ? 'Trực tuyến' : 'Mất kết nối'}
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm khách sạn..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoadingInbox ? (
                         <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Chưa có cuộc hội thoại nào.</div>
                    ) : (
                        filtered.map(conv => {
                            const isActive = selectedConv?.id === conv.id
                            const hasUnread = unreadConvIds.has(conv.id)
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => loadMessages(conv)}
                                    className={`w-full p-4 flex items-center gap-3 transition-all border-b border-gray-50
                                        ${isActive ? 'bg-blue-50' : 'hover:bg-white bg-transparent'}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                                            {conv.hotelImage ? <img src={conv.hotelImage} className="w-full h-full object-cover" /> : <Hotel size={20} />}
                                        </div>
                                        {hasUnread && (
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                                                {conv.hotelName}
                                            </p>
                                            <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">Nhấp để xem tin nhắn</p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Khung chat chính */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedConv ? (
                    <>
                        {/* Header Chat */}
                        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                                    <Hotel size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">{selectedConv.hotelName}</h3>
                                    <p className="text-[11px] text-green-500 font-medium">Đang trực tuyến</p>
                                </div>
                            </div>
                        </div>

                        {/* Danh sách tin nhắn */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                            {isLoadingMsgs ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>
                            ) : (
                                messages.map((msg) => {
                                    const isMine = msg.senderEmail === user?.email
                                    const isOptimistic = msg.id < 0
                                    return (
                                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-4 py-2 rounded-2xl text-sm ${
                                                    isMine 
                                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                                } ${isOptimistic ? 'opacity-70' : ''}`}>
                                                    {msg.content}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                                    <span className="text-[10px] text-gray-400">{fmt(msg.timestamp)}</span>
                                                    {isMine && (
                                                        <span className={`text-[10px] ${msg.isRead ? 'text-blue-500' : 'text-gray-300'}`}>
                                                            {isOptimistic ? 'Đang gửi' : msg.isRead ? 'Đã xem' : 'Đã gửi'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Ô nhập tin nhắn */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                    placeholder="Nhập nội dung tin nhắn..."
                                    className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || isSending || !isConnected}
                                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={40} className="text-blue-200" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Tin nhắn của bạn</h3>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">
                            Chọn một khách sạn ở danh sách bên trái để xem lịch sử trò chuyện.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}