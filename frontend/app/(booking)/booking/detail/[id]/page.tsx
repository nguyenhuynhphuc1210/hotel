'use client'

import React, { useState, useRef, ChangeEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { 
    ChevronLeft, MapPin, Calendar, User, 
    Phone, Mail, CreditCard, Receipt, 
    Hotel, Clock, CheckCircle2, AlertCircle, Printer,
    Star, ImagePlus, X, Send, MessageSquare
} from 'lucide-react'
import bookingApi from '@/lib/api/booking.api'
import { Loader2 } from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import toast from 'react-hot-toast'

// --- INTERFACE LỖI ---
interface ApiError {
    response?: {
        data?: {
            message?: string
        } | string
    }
}

function BookingDetailPage() {
    const params = useParams()
    const router = useRouter()
    const qc = useQueryClient()
    const bookingId = params.id as string

    // --- State cho Review ---
    const [rating, setRating] = useState<number>(5)
    const [comment, setComment] = useState<string>('')
    const [hoverRating, setHoverRating] = useState<number>(0)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const MAX_IMAGES = 5

    // --- Fetch Booking Detail ---
    const { data: booking, isLoading, isError } = useQuery({
        queryKey: ['booking-detail', bookingId],
        queryFn: () => bookingApi.getById(bookingId).then(res => res.data),
        enabled: !!bookingId
    })

    // --- Mutation Gửi Đánh Giá ---
    const reviewMutation = useMutation({
        mutationFn: () => {
            const formData = new FormData()
            // Backend nhận JSON qua part "data"
            const reviewData = JSON.stringify({ 
                bookingId: Number(bookingId), 
                rating, 
                comment 
            });
            formData.append('data', new Blob([reviewData], { type: 'application/json' }));
            
            // Part "files"
            selectedFiles.forEach(file => formData.append('files', file));
            
            return axiosInstance.post('/api/reviews', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
        },
        onSuccess: () => {
            toast.success('Cảm ơn bạn đã gửi đánh giá!')
            qc.invalidateQueries({ queryKey: ['booking-detail', bookingId] })
            setComment('')
            setSelectedFiles([])
            setPreviewUrls(prev => {
                prev.forEach(url => URL.revokeObjectURL(url));
                return [];
            });
        },
        onError: (err: ApiError) => {
            const msg = typeof err.response?.data === 'string' 
                ? err.response.data 
                : err.response?.data?.message || 'Gửi đánh giá thất bại'
            toast.error(msg)
        }
    })

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        )
    }

    if (isError || !booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <AlertCircle size={60} className="text-red-500" />
                <h2 className="text-2xl font-bold">Không tìm thấy thông tin đơn đặt phòng</h2>
                <button onClick={() => router.push('/profile?tab=bookings')} className="text-blue-600 font-semibold hover:underline">
                    Quay lại danh sách đơn đặt
                </button>
            </div>
        )
    }

    // --- Handlers Review ---
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const remaining = MAX_IMAGES - selectedFiles.length
        const allowed = files.slice(0, remaining)
        
        const valid = allowed.filter(f => f.size <= 5 * 1024 * 1024)
        if (valid.length < allowed.length) toast.error("Một số ảnh quá lớn (>5MB)")

        const newUrls = valid.map(f => URL.createObjectURL(f))
        setSelectedFiles(prev => [...prev, ...valid])
        setPreviewUrls(prev => [...prev, ...newUrls])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = (idx: number) => {
        URL.revokeObjectURL(previewUrls[idx])
        setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
        setPreviewUrls(prev => prev.filter((_, i) => i !== idx))
    }

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return { label: 'Đã xác nhận', color: 'bg-emerald-500', icon: <CheckCircle2 size={18} /> }
            case 'PENDING': return { label: 'Chờ xử lý', color: 'bg-amber-500', icon: <Clock size={18} /> }
            case 'CANCELLED': return { label: 'Đã hủy', color: 'bg-red-500', icon: <AlertCircle size={18} /> }
            case 'COMPLETED': return { label: 'Đã hoàn thành', color: 'bg-blue-500', icon: <CheckCircle2 size={18} /> }
            default: return { label: status, color: 'bg-gray-500', icon: <Clock size={18} /> }
        }
    }

    const status = getStatusInfo(booking.status)

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
        })
    }

    const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24))

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4">
                
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                        <ChevronLeft size={20} /> Quay lại
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all"
                    >
                        <Printer size={18} /> In đơn đặt phòng
                    </button>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                    
                    {/* Status Banner */}
                    <div className={`${status.color} p-6 text-white flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                            {status.icon}
                            <div>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Trạng thái đơn hàng</p>
                                <p className="text-xl font-black">{status.label}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Mã đặt phòng</p>
                            <p className="text-2xl font-black tracking-tighter">#{booking.bookingCode}</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 space-y-12">
                        
                        {/* Section 1: Hotel & Stay */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Hotel size={20} />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Thông tin khách sạn</h3>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-2">{booking.hotelName}</h2>
                                    <div className="flex items-start gap-2 text-gray-500 text-sm">
                                        <MapPin size={16} className="shrink-0 mt-0.5" />
                                        <span>{booking.hotelAddress}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                                        <Phone size={16} />
                                        <span>{booking.hotelPhone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-3xl p-6 grid grid-cols-2 gap-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Calendar size={80} />
                                </div>
                                <div className="z-10">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nhận phòng</p>
                                    <p className="font-bold text-gray-800">{formatDate(booking.checkInDate)}</p>
                                    <p className="text-xs text-gray-500">Sau 14:00</p>
                                </div>
                                <div className="z-10">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Trả phòng</p>
                                    <p className="font-bold text-gray-800">{formatDate(booking.checkOutDate)}</p>
                                    <p className="text-xs text-gray-500">Trước 12:00</p>
                                </div>
                                <div className="col-span-2 pt-4 border-t border-gray-200 mt-2 z-10">
                                    <p className="text-sm font-bold text-blue-600">Thời gian lưu trú: {nights} đêm</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Guest Info */}
                        <div className="border-t border-gray-100 pt-10">
                            <div className="flex items-center gap-2 text-blue-600 mb-6">
                                <User size={20} />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Thông tin khách hàng</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><User size={18}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Tên khách</p>
                                        <p className="font-bold text-gray-800">{booking.guestName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><Mail size={18}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                                        <p className="font-bold text-gray-800">{booking.guestEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><Phone size={18}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại</p>
                                        <p className="font-bold text-gray-800">{booking.guestPhone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Room Details */}
                        <div className="border-t border-gray-100 pt-10">
                            <div className="flex items-center gap-2 text-blue-600 mb-6">
                                <Receipt size={20} />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Chi tiết phòng</h3>
                            </div>
                            <div className="space-y-4">
                                {booking.bookingRooms.map((room, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm font-bold text-blue-600">
                                                x{room.quantity}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{room.roomTypeName}</p>
                                                <p className="text-xs text-gray-500">{room.pricePerNight.toLocaleString('vi-VN')}₫ / đêm</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-gray-900">
                                            {(room.quantity * room.pricePerNight * nights).toLocaleString('vi-VN')}₫
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 4: Payment Summary */}
                        <div className="border-t border-gray-100 pt-10">
                            <div className="bg-blue-600 rounded-[32px] p-8 text-white">
                                <div className="flex items-center gap-2 mb-6">
                                    <CreditCard size={20} />
                                    <h3 className="font-bold uppercase text-xs tracking-widest opacity-80">Tóm tắt thanh toán</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="opacity-70">Tạm tính</span>
                                        <span className="font-bold">{booking.subtotal.toLocaleString('vi-VN')}₫</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="opacity-70">Giảm giá</span>
                                        <span className="font-bold text-emerald-300">-{(booking.discountAmount ?? 0).toLocaleString('vi-VN')}₫</span>
                                    </div>
                                    <div className="h-px bg-white/20 my-4" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold">Tổng cộng</span>
                                        <span className="text-3xl font-black">{booking.totalAmount.toLocaleString('vi-VN')}₫</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- PHẦN ĐÁNH GIÁ (REVIEWS) --- */}
                        {booking.status === 'COMPLETED' && (
                            <div className="border-t border-gray-100 pt-10">
                                <div className="flex items-center gap-2 text-blue-600 mb-6">
                                    <MessageSquare size={20} />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Đánh giá kỳ nghỉ của bạn</h3>
                                </div>

                                <div className="bg-blue-50/50 border border-blue-100 rounded-[32px] p-8 space-y-8">
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-sm font-bold text-blue-900">Trải nghiệm của bạn như thế nào?</p>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button 
                                                    key={s} 
                                                    type="button"
                                                    onMouseEnter={() => setHoverRating(s)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setRating(s)}
                                                    className="transition-transform hover:scale-125 focus:outline-none"
                                                >
                                                    <Star 
                                                        size={36} 
                                                        fill={(hoverRating || rating) >= s ? '#f59e0b' : 'none'} 
                                                        className={(hoverRating || rating) >= s ? 'text-amber-400' : 'text-blue-200'} 
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-tighter">
                                            {['', 'Rất tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'][hoverRating || rating]}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <textarea 
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                            placeholder="Chia sẻ cảm nhận của bạn về phòng ốc, dịch vụ..."
                                            className="w-full p-5 bg-white border-none rounded-2xl text-sm shadow-sm min-h-[120px] outline-none focus:ring-2 ring-blue-200 transition-all resize-none"
                                        />

                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-3">
                                                {previewUrls.map((url, i) => (
                                                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-sm group">
                                                        <img src={url} alt="preview" className="w-full h-full object-cover" />
                                                        <button 
                                                            type="button"
                                                            onClick={() => removeFile(i)} 
                                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {selectedFiles.length < MAX_IMAGES && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-20 h-20 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-blue-400 hover:bg-white transition-colors"
                                                    >
                                                        <ImagePlus size={20} />
                                                        <span className="text-[10px] font-bold mt-1">Thêm ảnh</span>
                                                    </button>
                                                )}
                                            </div>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                hidden 
                                                multiple 
                                                accept="image/*" 
                                                onChange={handleFileChange} 
                                            />
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={() => reviewMutation.mutate()}
                                            disabled={reviewMutation.isPending || !comment.trim()}
                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                                        >
                                            {reviewMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />}
                                            Gửi đánh giá ngay
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-gray-400 text-xs mt-8">
                    Cảm ơn bạn đã tin dùng Vago Hotel. Nếu có thắc mắc, vui lòng liên hệ hotline 1900 xxxx.
                </p>
            </div>
        </div>
    )
}

export default dynamic(() => Promise.resolve(BookingDetailPage), { ssr: false })