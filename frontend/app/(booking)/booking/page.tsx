'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Calendar, MapPin,
    ArrowLeft, ShieldCheck, Loader2, CreditCard,
    Banknote, CheckCircle2, Hotel, Clock, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useMemo } from 'react'

import hotelApi from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import bookingApi from '@/lib/api/booking.api'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { useAuthStore } from '@/store/authStore'
import { RoomCalendarResponse } from '@/types/calendar.types'
import { AxiosError } from 'axios'

const bookingSchema = z.object({
    guestName: z.string().min(1, 'Vui lòng nhập họ tên'),
    guestEmail: z.string().email('Email không đúng định dạng'),
    guestPhone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Số điện thoại không hợp lệ'),
    paymentMethod: z.enum(['CASH', 'VNPAY']),
})

type BookingFormData = z.infer<typeof bookingSchema>

const PAYMENT_OPTIONS = [
    {
        value: 'VNPAY' as const,
        label: 'VNPay',
        desc: 'Thanh toán online qua cổng VNPay',
        icon: <CreditCard size={22} className="text-blue-600" />,
        badge: 'Phổ biến',
        badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
        value: 'CASH' as const,
        label: 'Tiền mặt tại khách sạn',
        desc: 'Thanh toán khi nhận phòng',
        icon: <Banknote size={22} className="text-emerald-600" />,
        badge: null,
        badgeColor: '',
    },
]

export default function BookingPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const user = useAuthStore((s) => s.user)

    const hotelId = Number(searchParams.get('hotelId'))
    const roomTypeId = Number(searchParams.get('roomTypeId'))
    const checkIn = searchParams.get('checkIn') || ''
    const checkOut = searchParams.get('checkOut') || ''
    const adults = searchParams.get('adults') || '2'

    const nights = Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    )

    const calCheckOut = useMemo(() => {
        if (!checkOut) return ''
        const d = new Date(checkOut)
        d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]
    }, [checkOut])

    // ── Queries ──
    const { data: hotel } = useQuery({
        queryKey: ['hotel-booking', hotelId],
        queryFn: () => hotelApi.getById(hotelId).then(r => r.data),
        enabled: !!hotelId,
    })

    const { data: roomType } = useQuery({
        queryKey: ['room-booking', roomTypeId],
        queryFn: () => roomApi.getById(roomTypeId).then(r => r.data),
        enabled: !!roomTypeId,
    })

    const { data: calendarData, isLoading: isCalLoading } = useQuery({
        queryKey: ['booking-calendar', roomTypeId, checkIn, calCheckOut],
        queryFn: () =>
            axiosInstance
                .get<RoomCalendarResponse[]>(API_CONFIG.ENDPOINTS.ROOM_CALENDAR(roomTypeId), {
                    params: { startDate: checkIn, endDate: calCheckOut },
                })
                .then(r => r.data),
        enabled: !!roomTypeId && !!checkIn && !!calCheckOut,
        staleTime: 1000 * 60 * 5,
    })

    const { avgPricePerNight, totalPrice, allAvailable } = useMemo(() => {
        const fallback = Number(roomType?.basePrice ?? 0)
        if (!calendarData || calendarData.length === 0) {
            return {
                avgPricePerNight: fallback,
                totalPrice: fallback * nights,
                allAvailable: true,
            }
        }
        const sum = calendarData.reduce((acc, c) => acc + Number(c.price), 0)
        const avg = Math.round(sum / calendarData.length)
        const available = calendarData.every(
            c => c.isAvailable && (c.totalRooms - c.bookedRooms) > 0
        )
        return {
            avgPricePerNight: avg,
            totalPrice: avg * nights,
            allAvailable: available,
        }
    }, [calendarData, roomType, nights])

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            guestName: user?.fullName || '',
            guestEmail: user?.email || '',
            guestPhone: user?.phone || '',
            paymentMethod: 'VNPAY',
        },
    })

    const selectedPayment = watch('paymentMethod')

    // ── FIXED ONSUBMIT ──
    const onSubmit = async (data: BookingFormData) => {
        try {
            const requestBody = {
                hotelId,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                guestName: data.guestName,
                guestEmail: data.guestEmail,
                guestPhone: data.guestPhone,
                paymentMethod: data.paymentMethod,
                bookingRooms: [{ roomTypeId, quantity: 1 }],
            }

            const res = await bookingApi.create(requestBody)
            
            const paymentUrl = res.data.paymentUrl

            if (paymentUrl) {
                toast.success('Đang chuyển hướng đến trang thanh toán...')
                window.location.href = paymentUrl; // Dùng href thay cho assign để chắc chắn hơn
            } else {
                toast.success('Đặt phòng thành công!')
                // Đảm bảo lấy đúng bookingCode từ res.data
                router.push(`/booking/success?bookingCode=${res.data.bookingCode}`)
            }
        } catch (err) {
            const error = err as AxiosError<{ message: string; errors: Record<string, string> }>
            const detail = error.response?.data?.errors
            const msg = detail
                ? Object.values(detail).join(', ')
                : error.response?.data?.message || 'Đã xảy ra lỗi khi đặt phòng'
            toast.error(msg)
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
        })
    }

    if (!hotel || !roomType) {
        return (
            <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <p className="text-gray-400 text-sm">Đang tải thông tin...</p>
                </div>
            </div>
        )
    }

    const roomImage = roomType.thumbnailUrl || roomType.images?.[0]?.imageUrl || hotel.images?.[0]?.imageUrl

    return (
        <div className="min-h-screen bg-[#f7f8fa] py-8 font-sans">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
                .booking-page { font-family: 'Be Vietnam Pro', sans-serif; }
                .input-field {
                    width: 100%; padding: 12px 16px;
                    border: 1.5px solid #e5e7eb; border-radius: 12px;
                    font-size: 14px; transition: all 0.2s; background: #fff;
                    outline: none; font-family: 'Be Vietnam Pro', sans-serif;
                }
                .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                .input-field.error { border-color: #ef4444; }
                .payment-card {
                    border: 2px solid #e5e7eb; border-radius: 16px; padding: 18px;
                    cursor: pointer; transition: all 0.2s; background: #fff; position: relative;
                }
                .payment-card:hover { border-color: #93c5fd; background: #f0f7ff; }
                .payment-card.selected { border-color: #3b82f6; background: #eff6ff; }
                .payment-card.selected .check-dot { opacity: 1; transform: scale(1); }
                .check-dot { opacity: 0; transform: scale(0.5); transition: all 0.2s; position: absolute; top: 14px; right: 14px; }
                .summary-card { background: #fff; border-radius: 20px; border: 1.5px solid #e5e7eb; overflow: hidden; }
                .section-card { background: #fff; border-radius: 20px; border: 1.5px solid #e5e7eb; padding: 28px; }
                .label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
                .step-badge { width: 28px; height: 28px; border-radius: 50%; background: #3b82f6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
                .divider { border: none; border-top: 1.5px dashed #e5e7eb; margin: 16px 0; }
                .room-chip { display: flex; align-items: center; gap: 6px; background: #f0f7ff; color: #1d4ed8; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 700; }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .fade-up { animation: fadeUp 0.4s ease forwards; }
                .fade-up-2 { animation: fadeUp 0.4s 0.1s ease both; }
                .fade-up-3 { animation: fadeUp 0.4s 0.2s ease both; }
            `}</style>

            <div className="booking-page max-w-6xl mx-auto px-4">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-7 transition-colors text-sm font-medium">
                    <ArrowLeft size={18} /> Quay lại
                </button>

                <div className="mb-8 fade-up">
                    <h1 className="text-2xl font-bold text-gray-900">Xác nhận đặt phòng</h1>
                    <p className="text-gray-400 text-sm mt-1">Kiểm tra thông tin và hoàn tất thanh toán</p>
                </div>

                <form id="booking-form" onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-12 gap-7">

                        {/* ── CỘT TRÁI ── */}
                        <div className="col-span-12 lg:col-span-7 space-y-6">

                            <div className="section-card fade-up">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="step-badge">1</div>
                                    <h2 className="text-base font-bold text-gray-900">Thông tin người đặt</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Họ và tên <span className="text-red-500">*</span></label>
                                        <input {...register('guestName')} className={`input-field ${errors.guestName ? 'error' : ''}`} placeholder="Nhập họ tên đầy đủ" />
                                        {errors.guestName && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.guestName.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Email <span className="text-red-500">*</span></label>
                                            <input {...register('guestEmail')} className={`input-field ${errors.guestEmail ? 'error' : ''}`} placeholder="example@gmail.com" />
                                            {errors.guestEmail && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.guestEmail.message}</p>}
                                        </div>
                                        <div>
                                            <label className="label">Số điện thoại <span className="text-red-500">*</span></label>
                                            <input {...register('guestPhone')} className={`input-field ${errors.guestPhone ? 'error' : ''}`} placeholder="09x xxx xxxx" />
                                            {errors.guestPhone && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.guestPhone.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="section-card fade-up-2">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="step-badge">2</div>
                                    <h2 className="text-base font-bold text-gray-900">Phương thức thanh toán</h2>
                                </div>
                                <div className="space-y-3">
                                    {PAYMENT_OPTIONS.map((opt) => (
                                        <label key={opt.value} className={`payment-card flex items-start gap-4 ${selectedPayment === opt.value ? 'selected' : ''}`}>
                                            <input type="radio" value={opt.value} {...register('paymentMethod')} className="hidden" />
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.value === 'VNPAY' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                                                {opt.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-gray-900 text-sm">{opt.label}</span>
                                                    {opt.badge && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${opt.badgeColor}`}>{opt.badge}</span>}
                                                </div>
                                                <p className="text-xs text-gray-400">{opt.desc}</p>
                                            </div>
                                            <div className="check-dot"><CheckCircle2 size={20} className="text-blue-600 fill-blue-100" /></div>
                                        </label>
                                    ))}
                                </div>
                                {selectedPayment === 'VNPAY' && (
                                    <div className="mt-4 flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                                        <CreditCard size={14} className="shrink-0 mt-0.5" />
                                        <span>Bạn sẽ được chuyển đến cổng thanh toán VNPay an toàn sau khi xác nhận.</span>
                                    </div>
                                )}
                                {selectedPayment === 'CASH' && (
                                    <div className="mt-4 flex items-start gap-2 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700">
                                        <Hotel size={14} className="shrink-0 mt-0.5" />
                                        <span>Vui lòng chuẩn bị đủ tiền mặt khi nhận phòng. Phòng sẽ được giữ trong <strong>24 giờ</strong>.</span>
                                    </div>
                                )}
                            </div>

                            <div className="fade-up-3 flex gap-3 items-start bg-white rounded-2xl border border-gray-100 p-5">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck size={18} className="text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm mb-0.5">Cam kết bảo mật</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Thông tin cá nhân của bạn được mã hóa và bảo vệ. Vago cam kết không phát sinh bất kỳ chi phí ẩn nào.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── CỘT PHẢI: TÓM TẮT ── */}
                        <div className="col-span-12 lg:col-span-5">
                            <div className="summary-card sticky top-24">
                                {roomImage && (
                                    <div className="relative h-44 overflow-hidden">
                                        <img src={roomImage} className="w-full h-full object-cover" alt={roomType.typeName} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-3 left-4 right-4">
                                            <div className="room-chip w-fit mb-1">{roomType.typeName}</div>
                                            <h3 className="text-white font-bold text-base line-clamp-1">{hotel.hotelName}</h3>
                                            <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
                                                <MapPin size={11} /> {hotel.district}, {hotel.city}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1"><Clock size={9} /> Nhận phòng</div>
                                            <div className="text-sm font-bold text-gray-800">{formatDate(checkIn)}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1"><Clock size={9} /> Trả phòng</div>
                                            <div className="text-sm font-bold text-gray-800">{formatDate(checkOut)}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-xl">
                                        <Calendar size={13} className="text-blue-500" />
                                        <span><strong className="text-blue-700">{nights} đêm</strong> · 1 phòng · {adults} khách</span>
                                    </div>

                                    <hr className="divider" />

                                    {isCalLoading ? (
                                        <div className="space-y-2.5">
                                            <div className="h-4 bg-gray-100 animate-pulse rounded-md w-3/4" />
                                            <div className="h-4 bg-gray-100 animate-pulse rounded-md w-1/2" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">
                                                    {avgPricePerNight.toLocaleString('vi-VN')}₫ × {nights} đêm
                                                </span>
                                                <span className="font-semibold text-gray-800">
                                                    {totalPrice.toLocaleString('vi-VN')}₫
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Thuế & Phí dịch vụ</span>
                                                <span className="text-emerald-600 font-semibold">Miễn phí</span>
                                            </div>
                                            {!allAvailable && (
                                                <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                                                    <Info size={12} className="shrink-0 mt-0.5" />
                                                    Một số ngày trong khoảng này có thể đã hết phòng.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-blue-600 rounded-2xl px-4 py-3 flex items-center justify-between">
                                        <span className="text-white/80 text-sm font-medium">Tổng cộng</span>
                                        {isCalLoading ? (
                                            <div className="h-6 w-28 bg-blue-400 animate-pulse rounded-md" />
                                        ) : (
                                            <span className="text-white text-xl font-black">
                                                {totalPrice.toLocaleString('vi-VN')}₫
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        form="booking-form"
                                        type="submit"
                                        disabled={isSubmitting || isCalLoading}
                                        className="w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                        style={{
                                            background: selectedPayment === 'VNPAY'
                                                ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
                                                : 'linear-gradient(135deg, #059669, #10b981)',
                                            color: '#fff',
                                            boxShadow: selectedPayment === 'VNPAY'
                                                ? '0 4px 14px rgba(59,130,246,0.4)'
                                                : '0 4px 14px rgba(16,185,129,0.4)',
                                        }}
                                    >
                                        {isSubmitting
                                            ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
                                            : isCalLoading
                                                ? <><Loader2 size={18} className="animate-spin" /> Đang tải giá...</>
                                                : selectedPayment === 'VNPAY'
                                                    ? <><CreditCard size={18} /> Thanh toán qua VNPay</>
                                                    : <><Banknote size={18} /> Xác nhận đặt phòng</>
                                        }
                                    </button>

                                    <p className="text-[10px] text-center text-gray-400 px-2 leading-relaxed">
                                        Bằng cách đặt phòng, bạn đồng ý với{' '}
                                        <span className="text-blue-500 cursor-pointer">Điều khoản sử dụng</span> và{' '}
                                        <span className="text-blue-500 cursor-pointer">Chính sách bảo mật</span> của Vago.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    )
}