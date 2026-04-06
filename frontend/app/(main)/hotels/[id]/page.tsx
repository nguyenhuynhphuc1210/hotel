'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
    MapPin, Star, Info,
    CheckCircle2,
    Users, Maximize2, BedDouble, Clock, ShieldCheck, Baby, Dog,
    LogIn, MessageSquare, Send, Loader2
} from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import { hotelAmenityApi } from '@/lib/api/amenity.api'
import policyApi from '@/lib/api/policy.api'
import SearchBar from '@/components/common/SearchBar'
import axiosInstance from '@/lib/api/axios'
import { useAuthStore } from '@/store/authStore'
import bookingApi from '@/lib/api/booking.api'
import { ReviewResponse } from '@/types/review.types'
import toast from 'react-hot-toast'
import HotelGallery from '@/components/layout/HotelGallery'


type RoomPriceMap = Record<number, number | null>

export default function HotelDetailPage() {
    const router = useRouter()
    const { id } = useParams()
    const hotelId = Number(id)
    const searchParams = useSearchParams()
    const { user } = useAuthStore()
    const qc = useQueryClient()

    const checkIn = searchParams.get('checkIn') || ''
    const checkOut = searchParams.get('checkOut') || ''
    const adults = Number(searchParams.get('adults') || 2)
    const hasFullDates = !!checkIn && !!checkOut

    // Review form state
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [hoverRating, setHoverRating] = useState(0)

    // 1. Thông tin khách sạn
    const { data: hotel, isLoading: isHotelLoading } = useQuery({
        queryKey: ['hotel-detail', hotelId],
        queryFn: () => hotelApi.getById(hotelId).then(r => r.data),
    })

    // 2. Danh sách loại phòng
    const { data: roomTypes = [] } = useQuery({
        queryKey: ['hotel-rooms', hotelId],
        queryFn: () => roomApi.getByHotelId(hotelId).then(r => r.data),
        enabled: !!hotelId
    })

    // 3. Tiện ích
    const { data: hotelAmenities = [] } = useQuery({
        queryKey: ['hotel-amenities', hotelId],
        queryFn: () => hotelAmenityApi.getByHotel(hotelId).then(r => r.data),
        enabled: !!hotelId
    })

    // 4. Chính sách
    const { data: policies = [] } = useQuery({
        queryKey: ['hotel-policies', hotelId],
        queryFn: () => policyApi.getAll().then(r => r.data.filter(p => p.hotelId === hotelId)),
        enabled: !!hotelId
    })

    // 5. Đánh giá PUBLIC — không cần auth
    const { data: reviewPage } = useQuery({
        queryKey: ['hotel-reviews-public', hotelId],
        queryFn: () => axiosInstance
            .get<{ content: ReviewResponse[] }>(`/api/reviews/hotel/${hotelId}/public`, {
                params: { page: 0, size: 50 }
            })
            .then(r => r.data),
        enabled: !!hotelId,
    })
    const reviews = reviewPage?.content ?? []

    // 6. Booking của user để kiểm tra điều kiện đánh giá
    const { data: myBookings = [] } = useQuery({
        queryKey: ['my-bookings-for-review', hotelId],
        queryFn: () => bookingApi.getMyBookings().then(r => r.data),
        enabled: !!user,
    })

    // Tìm booking COMPLETED của hotel này mà chưa có review
    const eligibleBooking = myBookings.find(b => {
        const isThisHotel = b.hotelId === hotelId
        const isCompleted = b.status === 'COMPLETED'
        // const checkoutPassed = new Date(b.checkOutDate) <= new Date()
        const notReviewed = !reviews.some(rv => rv.bookingId === b.id)
        // return isThisHotel && isCompleted && checkoutPassed && notReviewed
        return isThisHotel && isCompleted && notReviewed
    })

    const canReview = !!user && !!eligibleBooking

    // 7. Submit review
    const reviewMutation = useMutation({
        mutationFn: () => axiosInstance.post('/api/reviews', {
            bookingId: eligibleBooking?.id,
            rating,
            comment,
        }),
        onSuccess: () => {
            toast.success('Cảm ơn bạn đã đánh giá!')
            setComment('')
            setRating(5)
            qc.invalidateQueries({ queryKey: ['hotel-reviews-public', hotelId] })
            qc.invalidateQueries({ queryKey: ['my-bookings-for-review', hotelId] })
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { message?: string } } }
            toast.error(err?.response?.data?.message || 'Gửi đánh giá thất bại')
        }
    })



    const nights = hasFullDates
        ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
        : 0

    const handleShowPrice = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.set('openPicker', 'true')
        router.replace(`/hotels/${hotelId}?${newParams.toString()}`)
    }

    const handleBooking = (roomTypeId: number) => {
        if (!hasFullDates) { handleShowPrice(); return }
        const price = roomTypes.find(r => r.id === roomTypeId)?.basePrice ?? 0
        const params = new URLSearchParams({
            hotelId: hotelId.toString(),
            roomTypeId: roomTypeId.toString(),
            checkIn, checkOut,
            adults: adults.toString(),
            price: price.toString(),
        })
        router.push(`/booking?${params.toString()}`)
    }

    if (isHotelLoading) return <div className="py-20 text-center">Đang tải...</div>
    if (!hotel) return <div className="py-20 text-center">Không tìm thấy khách sạn</div>

    const images = hotel.images || []
    const mainImage = images.find(img => img.isPrimary)?.imageUrl || images[0]?.imageUrl
    const subImages = images.filter(img => img.imageUrl !== mainImage).slice(0, 4)

    const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1)
        : '0.0'

    const hotelPolicy = policies[0]

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Search Bar */}
            <div className="bg-white border-b sticky top-16 z-30 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <SearchBar
                        key={`search-${hotel.id}`}
                        variant="compact"
                        defaultValues={{ checkIn, checkOut, keyword: hotel.hotelName, district: hotel.district, adults }}
                    />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Gallery */}               
                <div className="mb-8">
                    <HotelGallery images={hotel.images || []} />
                </div>

                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 space-y-8">
                        {/* 1. Hotel Info (Name, Address, Stars) */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Khách sạn</span>
                                <div className="flex text-amber-400">
                                    {Array.from({ length: Math.round(hotel.starRating || 0) }).map((_, i) =>
                                        <Star key={i} size={14} fill="currentColor" />
                                    )}
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{hotel.hotelName}</h1>
                            <div className="flex items-start gap-1 text-sm text-gray-500">
                                <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>{hotel.addressLine}, {hotel.ward}, {hotel.district}, {hotel.city}</span>
                            </div>
                        </div>

                        {/* 2. MÔ TẢ KHÁCH SẠN (Description) - PHẦN MỚI THÊM */}
                        {hotel.description && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                                    <Info size={20} className="text-blue-500" />
                                    Giới thiệu về chỗ nghỉ
                                </h3>
                                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                    {hotel.description}
                                </div>
                            </div>
                        )}

                        {/* 3. Tiện ích */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-lg mb-6">Tiện ích tại chỗ nghỉ</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {hotelAmenities.map((ha) => (
                                    <div key={ha.amenityId} className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors">
                                        <div className="w-8 h-8 flex items-center justify-center text-blue-600 mb-2">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-700 text-center">{ha.amenityName}</span>
                                        {ha.isFree
                                            ? <span className="text-[9px] text-emerald-600 font-bold uppercase mt-1">Miễn phí</span>
                                            : <span className="text-[9px] text-amber-600 font-bold uppercase mt-1">Có phí</span>
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Chọn phòng */}
                        <div id="rooms" className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Chọn phòng</h3>
                                {hasFullDates && (
                                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        Thời gian lưu trú: <span className="font-bold text-blue-600">{nights} đêm</span>
                                    </span>
                                )}
                            </div>

                            {roomTypes.map((room) => {
                                const actualPrice = room.basePrice   // ← dùng basePrice trực tiếp
                                const totalAmount = actualPrice * nights
                                const isPricingLoading = false       // ← luôn false vì không gọi API giá
                                const roomImage = room.thumbnailUrl || room.images?.[0]?.imageUrl

                                return (
                                    <div key={room.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex shadow-sm hover:border-blue-300 transition-all group">
                                        <div className="w-72 h-56 shrink-0 relative overflow-hidden bg-gray-100 flex items-center justify-center">
                                            {roomImage
                                                ? <img src={roomImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={room.typeName} />
                                                : <BedDouble size={48} className="text-gray-300" />
                                            }
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{room.typeName}</h4>
                                                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4 font-medium">
                                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                                        <Users size={14} className="text-blue-500" />
                                                        {room.maxAdults} Người lớn, {room.maxChildren} Trẻ em
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                                        <Maximize2 size={14} className="text-blue-500" />
                                                        {room.roomSize} m²
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                                        <BedDouble size={14} className="text-blue-500" />
                                                        {room.bedType}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 line-clamp-2 italic leading-relaxed">
                                                    {room.description || 'Phòng đầy đủ tiện nghi với không gian thoáng mát, sạch sẽ.'}
                                                </p>
                                            </div>

                                            <div className="flex items-end justify-between border-t border-gray-100 pt-5 mt-4">
                                                <div className="space-y-1">
                                                    {hasFullDates ? (
                                                        <>
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Giá trung bình mỗi đêm</span>
                                                            {isPricingLoading
                                                                ? <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-md" />
                                                                : <>
                                                                    <div className="text-2xl font-black text-blue-600">{actualPrice.toLocaleString('vi-VN')}₫</div>
                                                                    <div className="text-xs text-gray-500">Tổng cộng: <span className="font-semibold text-gray-700">{totalAmount.toLocaleString('vi-VN')}₫</span> cho {nights} đêm</div>
                                                                </>
                                                            }
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Giá từ</span>
                                                            <div className="text-xl font-bold text-gray-400 italic">Vui lòng chọn ngày</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => hasFullDates ? handleBooking(room.id) : handleShowPrice()}
                                                    className={`px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-md ${hasFullDates
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                                        : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-none'
                                                        }`}
                                                >
                                                    {hasFullDates ? 'Đặt ngay' : 'Nhập ngày để xem giá'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {roomTypes.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                                    <Info className="mx-auto text-gray-300 mb-2" size={40} />
                                    <p className="text-gray-500">Hiện tại không còn phòng trống nào.</p>
                                </div>
                            )}
                        </div>

                        {/* 5. SECTION ĐÁNH GIÁ  */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <MessageSquare size={20} className="text-blue-500" />
                                    Đánh giá của khách hàng
                                </h3>
                                <span className="text-sm text-gray-400">{reviews.length} đánh giá</span>
                            </div>

                            {/* Form đánh giá */}
                            {!user ? (
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <LogIn size={18} className="text-blue-500 shrink-0" />
                                    <p className="text-sm text-blue-700">
                                        Vui lòng{' '}
                                        <button onClick={() => router.push(`/login?redirect=/hotels/${hotelId}`)} className="font-bold underline">đăng nhập</button>
                                        {' '}để gửi đánh giá.
                                    </p>
                                </div>
                            ) : !eligibleBooking ? (
                                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <Info size={18} className="text-amber-500 shrink-0" />
                                    <p className="text-sm text-amber-700">
                                        Bạn cần có đơn đặt phòng tại khách sạn này đã hoàn tất (sau ngày trả phòng) để gửi đánh giá.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
                                    <p className="text-sm font-semibold text-blue-800">Chia sẻ trải nghiệm của bạn</p>

                                    {/* Star rating */}
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <button
                                                key={s}
                                                onMouseEnter={() => setHoverRating(s)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(s)}
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Star
                                                    size={28}
                                                    fill={(hoverRating || rating) >= s ? '#f59e0b' : 'none'}
                                                    className={(hoverRating || rating) >= s ? 'text-amber-400' : 'text-gray-300'}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-sm font-semibold text-gray-600">
                                            {['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Xuất sắc'][hoverRating || rating]}
                                        </span>
                                    </div>

                                    {/* Comment */}
                                    <textarea
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        rows={3}
                                        placeholder="Chia sẻ trải nghiệm của bạn về khách sạn..."
                                        className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
                                    />

                                    <button
                                        onClick={() => reviewMutation.mutate()}
                                        disabled={reviewMutation.isPending || !comment.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {reviewMutation.isPending
                                            ? <Loader2 size={15} className="animate-spin" />
                                            : <Send size={15} />
                                        }
                                        Gửi đánh giá
                                    </button>
                                </div>
                            )}

                            {/* Danh sách đánh giá */}
                            {reviews.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-200" />
                                    <p className="text-sm">Chưa có đánh giá nào.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map(rv => (
                                        <div key={rv.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                                {rv.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-gray-900">{rv.userName}</span>
                                                    <span className="text-xs text-gray-400">{new Date(rv.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div className="flex items-center gap-0.5 mb-1.5">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} size={12}
                                                            fill={s <= Number(rv.rating) ? '#f59e0b' : 'none'}
                                                            className={s <= Number(rv.rating) ? 'text-amber-400' : 'text-gray-200'}
                                                        />
                                                    ))}
                                                    <span className="text-xs text-gray-500 ml-1">{rv.rating}</span>
                                                </div>
                                                {rv.comment && <p className="text-sm text-gray-600 leading-relaxed">{rv.comment}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="col-span-4 space-y-6">
                        {/* Rating summary */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-blue-900 text-lg">Đánh giá khách hàng</h4>
                                    <p className="text-xs text-gray-400">{reviews.length} bài đánh giá</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl">{avgRating}</div>
                            </div>
                            <div className="flex items-center gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={16}
                                        fill={s <= Math.round(Number(avgRating)) ? '#f59e0b' : 'none'}
                                        className={s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-200'}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Chính sách */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold mb-5 flex items-center gap-2 text-gray-900">
                                <ShieldCheck size={20} className="text-blue-600" /> Chính sách chỗ nghỉ
                            </h4>
                            {hotelPolicy ? (
                                <div className="space-y-5">
                                    <div className="flex gap-3">
                                        <Clock className="text-gray-400 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Giờ nhận/trả phòng</p>
                                            <p className="text-sm text-gray-700 mt-0.5">Nhận: <span className="font-semibold">{hotelPolicy.checkInTime}</span></p>
                                            <p className="text-sm text-gray-700">Trả: <span className="font-semibold">{hotelPolicy.checkOutTime}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Info className="text-gray-400 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Chính sách hủy phòng</p>
                                            <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{hotelPolicy.cancellationPolicy}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Baby className="text-gray-400 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Trẻ em & Giường phụ</p>
                                            <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{hotelPolicy.childrenPolicy}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Dog className="text-gray-400 shrink-0" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Thú cưng</p>
                                            <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{hotelPolicy.petPolicy}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Chưa cập nhật chính sách cụ thể.</p>
                            )}
                        </div>

                        {/* Support */}
                        <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg shadow-emerald-100 relative overflow-hidden group">
                            <div className="relative z-10">
                                <h4 className="font-bold mb-2">Bạn cần hỗ trợ?</h4>
                                <p className="text-sm text-emerald-50 mb-4 opacity-90">Đội ngũ hỗ trợ của Vago luôn sẵn sàng giúp bạn chọn phòng 24/7.</p>
                                <a href="tel:02838291234" className="text-2xl font-black block hover:scale-105 transition-transform origin-left">02838291234</a>
                            </div>
                            <div className="absolute -right-4 -bottom-4 text-white/10 group-hover:rotate-12 transition-transform">
                                <Info size={120} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}