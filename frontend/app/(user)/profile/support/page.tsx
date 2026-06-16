'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    Send, Loader2, Wifi, WifiOff, ShieldCheck,
    HelpCircle, ChevronDown, MessageCircle
} from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import { useAuthStore } from '@/store/authStore'
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

function parseTs(ts: string): Date {
    if (!ts) return new Date()
    return new Date(ts.replace(' ', 'T'))
}

function fmt(ts: string) {
    return parseTs(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ts: string) {
    return parseTs(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080/ws/chat'

const QUICK_QUESTIONS = [
    'Tôi cần hỗ trợ về đặt phòng của mình',
    'Tôi muốn hoàn tiền cho đơn đặt phòng',
    'Tôi gặp vấn đề với thanh toán',
    'Tôi muốn báo cáo vấn đề với khách sạn',
]

export default function UserSupportPage() {
    const { user, token } = useAuthStore()
    const qc = useQueryClient()

    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [conversationId, setConversationId] = useState<number | null>(null)
    const [inputText, setInputText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [showQuickQ, setShowQuickQ] = useState(false)

    const stompClientRef = useRef<Client | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const conversationIdRef = useRef<number | null>(null)
    conversationIdRef.current = conversationId

    
    useEffect(() => {
        const container = messagesContainerRef.current
        if (!container) return
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }, [messages])

    
    const loadHistory = useCallback(async () => {
        if (!user) return
        setIsLoadingMsgs(true)
        try {
            
            const res = await axiosInstance.get<{ id: number; type: string }[]>('/api/chat/user-inbox')
            const adminConv = res.data.find(c => c.type === 'USER_ADMIN')
            if (adminConv) {
                setConversationId(adminConv.id)
                const histRes = await axiosInstance.get<ChatMsg[]>(`/api/chat/history/${adminConv.id}`)
                setMessages(histRes.data)
            }
        } catch {
            setMessages([])
        } finally {
            setIsLoadingMsgs(false)
        }
    }, [user])

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    
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
                    const currentConvId = conversationIdRef.current

                    
                    if (!currentConvId) {
                        setConversationId(msg.conversationId)
                        conversationIdRef.current = msg.conversationId
                    }

                    if (msg.conversationId === (conversationIdRef.current ?? msg.conversationId)) {
                        setMessages(prev => {
                            const idx = prev.findIndex(
                                m => m.id < 0 && m.senderEmail === msg.senderEmail && m.content === msg.content
                            )
                            if (idx !== -1) {
                                const next = [...prev]; next[idx] = msg; return next
                            }
                            if (prev.some(m => m.id === msg.id)) return prev
                            return [...prev, msg]
                        })
                        
                        if (msg.senderEmail !== user.email) {
                            client.publish({
                                destination: '/app/chat.read',
                                body: JSON.stringify({
                                    conversationId: msg.conversationId,
                                    senderEmail: msg.senderEmail,
                                }),
                            })
                        }
                    }
                    qc.invalidateQueries({ queryKey: ['user-chat-inbox'] })
                })

                client.subscribe('/user/queue/read', (frame) => {
                    const cId: number = JSON.parse(frame.body)
                    if (conversationIdRef.current !== cId) return
                    setMessages(prev =>
                        prev.map(m => m.senderEmail === user.email ? { ...m, isRead: true } : m)
                    )
                })
            },
            onDisconnect: () => setIsConnected(false),
            onStompError: (f) => { console.error('STOMP error', f); setIsConnected(false) },
        })

        client.activate()
        stompClientRef.current = client
        return () => { client.deactivate() }
    }, [user, token, qc])

    const handleSend = (text?: string) => {
        const content = (text ?? inputText).trim()
        if (!content || !user || isSending || !stompClientRef.current?.connected) return

        setInputText('')
        setShowQuickQ(false)
        setIsSending(true)

        const tempId = -(Date.now())
        setMessages(prev => [...prev, {
            id: tempId,
            conversationId: conversationId ?? -1,
            senderEmail: user.email,
            content,
            timestamp: new Date().toISOString(),
            isRead: false,
        }])

        try {
            stompClientRef.current!.publish({
                destination: '/app/chat.send',
                body: JSON.stringify({
                    userId: user.id,
                    content,
                    type: 'USER_ADMIN',
                    receiverEmail: '', 
                }),
            })
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setInputText(content)
        } finally {
            setIsSending(false)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }

    
    const groupedMessages = messages.reduce<{ date: string; msgs: ChatMsg[] }[]>((acc, msg) => {
        const d = fmtDate(msg.timestamp)
        const last = acc[acc.length - 1]
        if (last && last.date === d) { last.msgs.push(msg) }
        else { acc.push({ date: d, msgs: [msg] }) }
        return acc
    }, [])

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
            style={{ height: '700px' }}>

            
            <div className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">Hỗ trợ từ Vago</p>
                    <p className="text-blue-100 text-xs mt-0.5">Đội ngũ hỗ trợ · Phản hồi trong 24 giờ</p>
                </div>
                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full
                    ${isConnected ? 'bg-green-400/20 text-green-100' : 'bg-white/10 text-white/60'}`}>
                    {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                    {isConnected ? 'Trực tuyến' : 'Ngoại tuyến'}
                </div>
            </div>

            
            <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center gap-2">
                <HelpCircle size={14} className="text-blue-400 shrink-0" />
                <p className="text-xs text-blue-600">
                    Mô tả vấn đề chi tiết để được hỗ trợ nhanh hơn.
                    Bạn cũng có thể đính kèm mã đặt phòng nếu cần.
                </p>
            </div>

            
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/50 space-y-4">
                {isLoadingMsgs ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 size={24} className="animate-spin text-blue-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <MessageCircle size={28} className="text-blue-300" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-700 text-sm">Xin chào, {user?.fullName ?? 'bạn'}!</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-xs">
                                Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy cho chúng tôi biết vấn đề của bạn.
                            </p>
                        </div>
                        
                        <div className="w-full max-w-sm space-y-2 mt-1">
                            {QUICK_QUESTIONS.map(q => (
                                <button
                                    key={q}
                                    onClick={() => handleSend(q)}
                                    disabled={!isConnected}
                                    className="w-full text-left px-4 py-2.5 bg-white border border-gray-200 rounded-xl
                                        text-xs text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50
                                        transition-colors disabled:opacity-40"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    groupedMessages.map(({ date, msgs }) => (
                        <div key={date} className="space-y-3">
                            
                            <div className="flex items-center gap-3 py-1">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] text-gray-400 font-medium px-2">{date}</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {msgs.map(msg => {
                                const isMine = msg.senderEmail === user?.email
                                const isOptimistic = msg.id < 0
                                return (
                                    <div key={msg.id} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        
                                        {!isMine && (
                                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-auto mb-5">
                                                <ShieldCheck size={14} className="text-white" />
                                            </div>
                                        )}

                                        <div className={`max-w-[75%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                                            {!isMine && (
                                                <span className="text-[10px] text-gray-400 px-1 font-medium">Admin · Vago Hotel</span>
                                            )}
                                            <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed
                                                ${isOptimistic ? 'opacity-60' : ''}
                                                ${isMine
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[10px] text-gray-400">{fmt(msg.timestamp)}</span>
                                                {isMine && (
                                                    <span className={`text-[10px] ${msg.isRead ? 'text-blue-500' : 'text-gray-300'}`}>
                                                        {isOptimistic ? 'Đang gửi' : msg.isRead ? 'Đã xem' : 'Đã gửi'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        
                                        {isMine && user?.avatarUrl && (
                                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto mb-5 border border-gray-200">
                                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))
                )}
            </div>

            
            <div className="shrink-0 border-t border-gray-100 bg-white p-4 space-y-2">
                
                {messages.length > 0 && (
                    <div>
                        <button
                            onClick={() => setShowQuickQ(v => !v)}
                            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                        >
                            <HelpCircle size={12} />
                            Câu hỏi thường gặp
                            <ChevronDown size={12} className={`transition-transform ${showQuickQ ? 'rotate-180' : ''}`} />
                        </button>
                        {showQuickQ && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {QUICK_QUESTIONS.map(q => (
                                    <button
                                        key={q}
                                        onClick={() => handleSend(q)}
                                        disabled={!isConnected}
                                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100
                                            hover:bg-blue-100 transition-colors disabled:opacity-40"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        placeholder="Nhập tin nhắn gửi cho bộ phận hỗ trợ..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm
                            outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!inputText.trim() || isSending || !isConnected}
                        className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center
                            hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                    >
                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>

                {!isConnected && (
                    <p className="text-[11px] text-amber-500 flex items-center gap-1.5">
                        <WifiOff size={11} />
                        Mất kết nối — tin nhắn realtime chưa hoạt động
                    </p>
                )}
            </div>
        </div>
    )
}