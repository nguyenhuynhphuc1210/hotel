'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X, RotateCcw, Bot, User, ChevronDown } from 'lucide-react'
import axiosInstance from '@/lib/api/axios'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isLoading?: boolean
}

// ── Markdown render nhẹ ───────────────────────────────────────────────────────
function renderMarkdown(text: string) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gm, '<li class="flex gap-1.5 mb-0.5"><span class="text-blue-400 shrink-0">•</span><span>$1</span></li>')
        .replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="my-1.5">$1</ul>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>')
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
    return (
        <div className="flex items-center gap-1 py-0.5 px-1">
            {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.7s' }} />
            ))}
        </div>
    )
}

// ── Quick suggestions ─────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
    '🏨 Gợi ý khách sạn tốt?',
    '💰 Đặt phòng giá rẻ?',
    '📅 Chính sách hủy phòng?',
    '🛏️ Phòng nào phù hợp nhất?',
]

const WELCOME = 'Xin chào! Tôi là **Vago AI** 🤖\nTôi có thể tư vấn về khách sạn, phòng nghỉ và lịch trình du lịch cho bạn!'

// ── Widget ────────────────────────────────────────────────────────────────────
export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, role: 'assistant', content: WELCOME, timestamp: new Date() }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showBubble, setShowBubble] = useState(true)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Ẩn bubble sau 5 giây
    useEffect(() => {
        const t = setTimeout(() => setShowBubble(false), 5000)
        return () => clearTimeout(t)
    }, [])

    const handleOpen = () => {
        setIsOpen(true)
        setShowBubble(false)
        setTimeout(() => inputRef.current?.focus(), 200)
    }

    const sendMessage = async (promptOverride?: string) => {
        const prompt = (promptOverride ?? input).trim()
        if (!prompt || isLoading) return

        setInput('')
        setIsLoading(true)

        const userMsg: Message = { id: Date.now(), role: 'user', content: prompt, timestamp: new Date() }
        const loadingMsg: Message = { id: Date.now() + 1, role: 'assistant', content: '', timestamp: new Date(), isLoading: true }
        setMessages(prev => [...prev, userMsg, loadingMsg])

        try {
            const res = await axiosInstance.post<{ reply: string }>('/api/chat/ai', {
                prompt,
                hotelId: null,
            })
            setMessages(prev => prev.map(m =>
                m.id === loadingMsg.id
                    ? { ...m, content: res.data.reply, isLoading: false, timestamp: new Date() }
                    : m
            ))
        } catch {
            setMessages(prev => prev.map(m =>
                m.id === loadingMsg.id
                    ? { ...m, content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 😔', isLoading: false, timestamp: new Date() }
                    : m
            ))
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = () => {
        setMessages([{ id: Date.now(), role: 'assistant', content: WELCOME, timestamp: new Date() }])
        setInput('')
    }

    const unreadCount = 0 // có thể mở rộng sau

    return (
        // Đặt ở góc phải dưới, trên HotelChatWidget (z-index cao hơn 1 chút)
        // HotelChatWidget ở bottom-6 right-6
        // Widget này ở bottom-6 right-24 (cách sang trái)
        <div className="fixed bottom-6 right-24 z-50 flex flex-col items-end gap-2">

            {/* ── Popup chat ──────────────────────────────────────────── */}
            {isOpen && (
                <div
                    className="w-[360px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-100"
                    style={{
                        height: '520px',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                        animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                >
                    <style>{`
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px) scale(0.95); }
                            to   { opacity: 1; transform: translateY(0)    scale(1); }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(6px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                        .msg-enter { animation: fadeIn 0.2s ease; }
                    `}</style>

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3.5 flex items-center gap-3 shrink-0">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">Vago AI</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                                <span className="text-white/75 text-[11px]">Trợ lý du lịch thông minh</span>
                            </div>
                        </div>
                        <button onClick={handleReset} title="Cuộc trò chuyện mới"
                            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <RotateCcw size={15} />
                        </button>
                        <button onClick={() => setIsOpen(false)}
                            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <ChevronDown size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 space-y-3"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>

                        {messages.map((msg, idx) => {
                            const isUser = msg.role === 'user'
                            const isFirst = idx === 0
                            return (
                                <div key={msg.id} className={`msg-enter flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    {!isUser && (
                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-auto mb-4">
                                            <Bot size={13} className="text-white" />
                                        </div>
                                    )}
                                    {isUser && (
                                        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center shrink-0 mt-auto mb-4">
                                            <User size={13} className="text-gray-600" />
                                        </div>
                                    )}

                                    <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                                            ${isUser
                                                ? 'bg-blue-600 text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                                            }`}>
                                            {msg.isLoading ? (
                                                <TypingDots />
                                            ) : isUser ? (
                                                <span>{msg.content}</span>
                                            ) : (
                                                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                            )}
                                        </div>

                                        {/* Quick questions chỉ hiện dưới tin welcome */}
                                        {isFirst && !isUser && messages.length === 1 && (
                                            <div className="flex flex-col gap-1.5 mt-1 w-full">
                                                {QUICK_QUESTIONS.map(q => (
                                                    <button key={q} onClick={() => sendMessage(q)} disabled={isLoading}
                                                        className="text-left text-xs px-3 py-2 bg-white border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all font-medium disabled:opacity-40 shadow-sm">
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <span className="text-[10px] text-gray-400 px-1">
                                            {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-gray-50 px-4 py-1.5 border-t border-gray-100 shrink-0">
                        <p className="text-[10px] text-gray-400 text-center">
                            Thông tin chỉ mang tính tham khảo, được tư vấn bởi Trí Tuệ Nhân Tạo
                        </p>
                    </div>

                    {/* Input */}
                    <div className="bg-white px-3 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 shrink-0 shadow-md shadow-blue-200"
                        >
                            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Preview bubble (hiện 5s rồi tắt) ──────────────────── */}
            {showBubble && !isOpen && (
                <div
                    onClick={handleOpen}
                    className="bg-white rounded-2xl rounded-br-sm shadow-xl border border-gray-100 px-4 py-3 max-w-[220px] cursor-pointer hover:shadow-2xl transition-all"
                    style={{ animation: 'slideUp 0.3s ease' }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <Bot size={11} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-gray-800">Vago AI</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Xin chào! Tôi là trợ lý AI của Vago Hotel 😊
                    </p>
                </div>
            )}

            {/* ── FAB Button ─────────────────────────────────────────── */}
            <button
                onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                className="relative flex flex-col items-center gap-1 group"
                title="Chat với Vago AI"
            >
                {/* Circle button */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95
                    ${isOpen
                        ? 'bg-gray-600 hover:bg-gray-700'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-violet-600'
                    }`}
                    style={{ boxShadow: isOpen ? undefined : '0 8px 24px rgba(37,99,235,0.4)' }}
                >
                    {isOpen
                        ? <X size={22} className="text-white" />
                        : <Bot size={22} className="text-white" />
                    }

                    {/* Pulse ring khi đóng */}
                    {!isOpen && (
                        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
                    )}
                </div>

                {/* Label dưới button */}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all
                    ${isOpen ? 'text-gray-500' : 'text-blue-700 bg-blue-50'}`}>
                    Trợ lý AI
                </span>
            </button>
        </div>
    )
}