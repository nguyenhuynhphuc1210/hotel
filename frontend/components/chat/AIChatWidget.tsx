'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { 
    Send, Loader2, X, RotateCcw, Bot, User, 
    ChevronDown, Sparkles, Trash2, MessageSquare,
    RefreshCw, AlertCircle
} from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    status?: 'sending' | 'sent' | 'error'
}

// ── Markdown Parser Cải Tiến ─────────────────────────────────────────────────
function renderMarkdown(text: string) {
    if (!text) return ''
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-900">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/^- (.*$)/gm, '<li class="flex gap-2 mb-1.5"><span class="text-blue-500 shrink-0 mt-1">•</span><span>$1</span></li>')
        .replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="my-2 pl-1">$1</ul>')
        .replace(/\n\n/g, '<div class="h-2"></div>')
        .replace(/\n/g, '<br/>')
}

// ── Components nhỏ ───────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div className="flex items-center gap-1.5 py-2 px-3 bg-white border border-gray-100 rounded-2xl w-fit shadow-sm">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" />
    </div>
)

const WELCOME_TEXT = 'Xin chào! Tôi là **Vago AI** 🤖\n\nTôi có thể giúp bạn tìm phòng, kiểm tra giá, tư vấn lịch trình hoặc giải đáp chính sách khách sạn. Bạn cần hỗ trợ gì hôm nay?'

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function AIChatWidget() {
    const params = useParams()
    const hotelId = params?.id ? Number(params.id) : null

    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [showBubble, setShowBubble] = useState(true)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // 1. Khởi tạo & Load lịch sử từ LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('vago_ai_chat')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setMessages(parsed)
            } catch (e) {
                setMessages([{ id: 'init', role: 'assistant', content: WELCOME_TEXT, timestamp: Date.now() }])
            }
        } else {
            setMessages([{ id: 'init', role: 'assistant', content: WELCOME_TEXT, timestamp: Date.now() }])
        }
        
        const t = setTimeout(() => setShowBubble(false), 8000)
        return () => clearTimeout(t)
    }, [])

    // 2. Lưu lịch sử khi có tin nhắn mới
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('vago_ai_chat', JSON.stringify(messages))
        }
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleOpen = () => {
        setIsOpen(true)
        setShowBubble(false)
        setTimeout(() => inputRef.current?.focus(), 300)
    }

    const sendMessage = async (overrideText?: string) => {
        const content = (overrideText ?? input).trim()
        if (!content || isTyping) return

        setInput('')
        if (inputRef.current) inputRef.current.style.height = 'auto'

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: Date.now(),
            status: 'sent'
        }

        setMessages(prev => [...prev, userMsg])
        setIsTyping(true)

        try {
            const res = await axiosInstance.post<{ reply: string }>('/api/chat/ai', {
                prompt: content,
                hotelId: hotelId, // Tự động gửi context hotel nếu đang ở trang chi tiết
                history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })) // Gửi kèm lịch sử ngắn
            })

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.reply,
                timestamp: Date.now()
            }
            setMessages(prev => [...prev, aiMsg])
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Rất tiếc, kết nối của tôi đang gặp sự cố. Bạn vui lòng thử lại nhé! 🛠️',
                timestamp: Date.now(),
                status: 'error'
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    const clearChat = () => {
        if (confirm('Bạn có muốn xóa toàn bộ lịch sử trò chuyện?')) {
            const initMsg: Message = { id: 'init', role: 'assistant', content: WELCOME_TEXT, timestamp: Date.now() }
            setMessages([initMsg])
            localStorage.removeItem('vago_ai_chat')
        }
    }

    // Gợi ý câu hỏi dựa trên việc có đang ở trang khách sạn hay không
    const suggestions = hotelId 
        ? ['Giá phòng đêm nay?', 'Khách sạn có cho nuôi thú cưng không?', 'Giờ nhận/trả phòng?']
        : ['Tìm khách sạn ở TP. Hồ Chí Minh', 'Chính sách hoàn tiền?', 'Ưu đãi hôm nay']

    return (
        <div className="fixed bottom-6 right-24 z-[60] flex flex-col items-end gap-3">
            
            {/* ── Chat Window ────────────────────────────────────────── */}
            {isOpen && (
                <div 
                    className="w-[380px] md:w-[420px] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                    style={{ height: '600px' }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-4 text-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                        <Bot size={22} className="text-white" />
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-blue-600 rounded-full"></span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                                        Vago AI Assistant
                                        <Sparkles size={12} className="text-yellow-300 fill-yellow-300" />
                                    </h3>
                                    <p className="text-[10px] text-blue-100 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-blue-200 rounded-full animate-pulse"></span>
                                        Phản hồi ngay lập tức
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full transition-colors text-blue-100" title="Xóa lịch sử">
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <ChevronDown size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 space-y-4 scroll-smooth custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={msg.id} className={cn("flex flex-col animate-in fade-in slide-in-from-top-1", msg.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === 'user' 
                                        ? "bg-blue-600 text-white rounded-br-none" 
                                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                                )}>
                                    {msg.role === 'assistant' ? (
                                        <div 
                                            className="prose prose-sm prose-blue leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} 
                                        />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-1 mt-1 px-1">
                                    {msg.status === 'error' && <AlertCircle size={10} className="text-red-500" />}
                                    <span className="text-[9px] text-gray-400">
                                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* Suggestions (Chỉ hiện sau tin nhắn cuối cùng của AI) */}
                                {idx === messages.length - 1 && msg.role === 'assistant' && !isTyping && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {suggestions.map((s, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => sendMessage(s)}
                                                className="text-[11px] bg-white border border-blue-100 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm active:scale-95"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Hỏi Vago AI về phòng, giá, ưu đãi..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none py-1 max-h-[100px] custom-scrollbar"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || isTyping}
                                className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                                    input.trim() && !isTyping ? "bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                            <Bot size={10} /> AI có thể nhầm lẫn, hãy kiểm tra lại thông tin quan trọng.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Bubble Preview ──────────────────────────────────────── */}
            {showBubble && !isOpen && (
                <div 
                    className="bg-white p-3 rounded-2xl rounded-br-sm shadow-xl border border-blue-50 max-w-[200px] animate-in slide-in-from-right-5 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={handleOpen}
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <Bot size={12} className="text-white" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-800">Vago AI</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug">
                        {hotelId ? "Bạn cần thông tin về khách sạn này?" : "Tôi có thể giúp bạn tìm khách sạn ưng ý!"}
                    </p>
                </div>
            )}

            {/* ── FAB Button ─────────────────────────────────────────── */}
            <button
                onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative group active:scale-90",
                    isOpen ? "bg-gray-800 rotate-90" : "bg-gradient-to-tr from-blue-600 to-indigo-600"
                )}
            >
                {isOpen ? (
                    <X size={24} className="text-white" />
                ) : (
                    <>
                        <Bot size={26} className="text-white group-hover:scale-110 transition-transform" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                            1
                        </span>
                        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
                    </>
                )}
            </button>
            
            {/* Label dưới nút */}
            <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm transition-all",
                isOpen ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600 border border-blue-100"
            )}>
                VAGO AI
            </span>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
            `}</style>
        </div>
    )
}