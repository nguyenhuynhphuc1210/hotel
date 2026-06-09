'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState, useRef, useMemo, useTransition, Suspense, useEffect } from 'react'
import {
    MapPin, Star, Info,
    CheckCircle2,
    Users, Maximize2, BedDouble, Clock, ShieldCheck, Baby, Dog,
    LogIn, MessageSquare, Send, Loader2, ImagePlus, X, ChevronLeft, ChevronRight,
    Bot, Tag
} from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import { RoomTypeResponse } from '@/types/room.types'
import { RoomCalendarResponse } from '@/types/calendar.types'
import roomApi from '@/lib/api/room.api'
import { hotelAmenityApi } from '@/lib/api/amenity.api'
import policyApi from '@/lib/api/policy.api'
import SearchBar from '@/components/common/SearchBar'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { useAuthStore } from '@/store/authStore'
import bookingApi from '@/lib/api/booking.api'
import { ReviewResponse } from '@/types/review.types'
import toast from 'react-hot-toast'
import HotelGallery from '@/components/layout/HotelGallery'
import RoomGalleryModal from '@/components/layout/RoomGalleryModal'
import { HotelPolicyResponse } from '@/types/policy.types'
import { BookingResponse } from '@/types/booking.types'
import Pagination from '@/components/ui/PaginationDetail'
import HotelChatWidget from '@/components/chat/HotelChatWidget'
import { roomTypeAmenityApi } from '@/lib/api/amenity.api'
import { RoomTypeAmenityResponse } from '@/types/amenity.types'
import AIChatWidget from '@/components/chat/AIChatWidget'
import { cn } from '@/lib/utils'
import promotionApi from '@/lib/api/promotion.api'
import { PromotionResponse } from '@/types/promotion.types'

// ── Hook: fetch calendar cho 1 room trong khoảng checkIn/checkOut ──────────
function useRoomCalendarPricing(
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
    enabled: boolean
) {
    return useQuery({
        queryKey: ['room-calendar-public', roomTypeId, checkIn, checkOut],
        queryFn: () =>
            axiosInstance
                .get<RoomCalendarResponse[]>(API_CONFIG.ENDPOINTS.ROOM_CALENDAR(roomTypeId), {
                    params: { startDate: checkIn, endDate: checkOut },
                })
                .then(r => r.data),
        enabled: enabled && !!roomTypeId && !!checkIn && !!checkOut,
        staleTime: 1000 * 60 * 5,
    })
}

// ── Helper: tính giá trung bình / đêm từ calendar ─────────────────────────
function calcAvgPrice(
    calendarData: RoomCalendarResponse[] | undefined,
    fallback: number
): { avgPrice: number; allAvailable: boolean } {
    if (!calendarData || calendarData.length === 0) {
        return { avgPrice: fallback, allAvailable: true }
    }
    const total = calendarData.reduce((sum, c) => sum + Number(c.price), 0)
    const avgPrice = Math.round(total / calendarData.length)
    const allAvailable = calendarData.every(c => c.isAvailable && (c.totalRooms - c.bookedRooms) > 0)
    return { avgPrice, allAvailable }
}

// ── Sub-component: một card phòng (có fetch giá riêng) ────────────────────
function RoomCard({
    room,
    hasFullDates,
    checkIn,
    checkOut,
    nights,
    onBook,
    onOpenGallery,
    defaultRooms,
    adults,
}: {
    room: RoomTypeResponse
    hasFullDates: boolean
    checkIn: string
    checkOut: string
    nights: number
    onBook: (id: number, quantity: number) => void
    onOpenGallery: (room: RoomTypeResponse) => void
    defaultRooms: number
    adults: number
}) {

    const searchParams = useSearchParams();
    const childAgesRaw = searchParams.getAll('childAges').map(Number);

    const under6 = childAgesRaw.filter(age => age >= 0 && age <= 5);
const freeChildren = under6.slice(0, 1);               
const paidUnder6Count = Math.max(0, under6.length - 1); 
const adultChildrenCount = childAgesRaw.filter(age => age >= 6).length;
const totalEffectiveAdults = adults + adultChildrenCount + paidUnder6Count;



    const calCheckOut = useMemo(() => {
        if (!checkOut) return ''
        const d = new Date(checkOut)
        d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]
    }, [checkOut])

    const { data: calendarData, isLoading: isCalLoading } = useRoomCalendarPricing(
        room.id,
        checkIn,
        calCheckOut,
        hasFullDates
    )

    const { data: amenities = [] } = useQuery<RoomTypeAmenityResponse[]>({
        queryKey: ['room-type-amenities-public', room.id],
        queryFn: () => roomTypeAmenityApi.getByRoomType(room.id).then(r => r.data),
        staleTime: 1000 * 60 * 10,
    })

    const { avgPrice, allAvailable } = useMemo(
        () => calcAvgPrice(calendarData, Number(room.basePrice)),
        [calendarData, room.basePrice]
    )

    const totalAmount = avgPrice * nights
    const roomImage = room.thumbnailUrl || room.images?.[0]?.imageUrl
    const imageCount = room.images?.length || 0

    const availableRooms = useMemo(() => {
        if (!calendarData || calendarData.length === 0) return room.totalRooms ?? 1;
        return Math.min(...calendarData.map(c => c.totalRooms - c.bookedRooms));
    }, [calendarData, room.totalRooms]);

    // Agoda style:
    // 8 khách => có thể chọn tối đa 8 phòng
    const maxSelectable = Math.min(
        availableRooms,
        adults
    )

    const finalMaxSelectable = Math.max(1, availableRooms);

    const [quantity, setQuantity] = useState(defaultRooms);

    useEffect(() => {
        setQuantity(Math.min(defaultRooms, finalMaxSelectable));
    }, [defaultRooms, finalMaxSelectable]);

    const isLowStock = availableRooms > 0 && availableRooms <= 4

    const avgAdultsPerRoom = Math.ceil(totalEffectiveAdults / defaultRooms);
    const roomMaxAdults = room.maxAdults ?? 2;
    const isOverCapacity = avgAdultsPerRoom > roomMaxAdults;

    return (
        <div className="bg-white rounded-[24px] border border-gray-200 overflow-hidden flex shadow-sm hover:shadow-md transition-all group mb-6">

            {/* CỘT TRÁI: Hình ảnh + Nút chi tiết + Thông số phòng (Người, Diện tích, Giường) */}
            <div className="p-4 shrink-0 w-[280px] flex flex-col items-center border-r border-gray-50">
                {/* Hình ảnh */}
                <div
                    className="w-full h-[180px] relative overflow-hidden rounded-[18px] bg-gray-100 cursor-pointer group/img shadow-sm"
                    onClick={() => onOpenGallery(room)}
                >
                    {roomImage ? (
                        <img
                            src={roomImage}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                            alt={room.typeName}
                        />
                    ) : (
                        <BedDouble size={48} className="text-gray-200" />
                    )}
                </div>

                {/* Nút xem chi tiết */}
                <button
                    onClick={() => onOpenGallery(room)}
                    className="mt-3 text-blue-600 text-xs font-bold hover:underline"
                >
                    Xem ảnh và chi tiết
                </button>

                {/* PHẦN THÔNG SỐ PHÒNG: Đã chuyển sang đây (Dưới nút xem ảnh) */}
                <div className="mt-4 w-full space-y-2">

                    <h4
                        className="font-bold text-2xl text-blue-600 hover:text-blue-700 transition-colors cursor-pointer leading-tight mb-3"
                        onClick={() => onOpenGallery(room)}
                    >
                        {room.typeName}
                    </h4>

                    <div className="flex items-center gap-2.5 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                        <Maximize2 size={16} className="text-blue-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-gray-600">
                            {room.roomSize} m²
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                        <BedDouble size={16} className="text-blue-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-gray-600">
                            {room.bedType}
                        </span>
                    </div>
                </div>
            </div>


            <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className={cn("shrink-0", isOverCapacity ? "text-red-500" : "text-blue-500")} />
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn("text-[13px] font-bold", isOverCapacity ? "text-red-600" : "text-gray-700")}>
                                {roomMaxAdults} người lớn
                                {room.maxChildren != null && room.maxChildren > 0 && ` & ${room.maxChildren} trẻ em`}
                            </span>
                            {isOverCapacity && (
                                <span className="text-[12px] font-medium text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">
                                    Vượt quá sức chứa phòng <Info size={12} />
                                </span>
                            )}
                        </div>
                    </div>

                    {freeChildren.length > 0 && !isOverCapacity && (
                        <div className="mt-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[13px]">
                                <span className="text-emerald-500 font-bold">↑</span>
                                <span>Con của quý khách được ở <span className="font-black">MIỄN PHÍ!</span></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-[13px]">
                                <span className="text-emerald-500 font-bold">↑</span>
                                <span>
                                    Trẻ em {freeChildren[0] === 0 ? 'dưới 1 tuổi' : `${freeChildren[0]} tuổi`} lưu trú miễn phí với giường có sẵn
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Mô tả in nghiêng giống ảnh mẫu */}
                    <p className="text-sm text-gray-500 italic leading-relaxed mb-6">
                        {room.description || 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản'}
                    </p>

                    {/* Tiện ích phòng */}
                    {amenities.length > 0 && (
                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                Tiện ích phòng
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {amenities.map(a => (
                                    <span
                                        key={a.amenityId}
                                        className="flex items-center gap-1.5 text-[11px] bg-blue-50/50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100"
                                    >
                                        {a.iconUrl
                                            ? <img src={a.iconUrl} className="w-3 h-3 object-contain" alt="" />
                                            : <CheckCircle2 size={11} />
                                        }
                                        {a.amenityName}
                                    </span>
                                ))}
                            </div>

                            {/* Badge hút thuốc */}
                            <div className="mt-3">
                                {room.isNonSmoking ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
                                        🚭 Không hút thuốc
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-md">
                                        🚬 Cho phép hút thuốc
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Phần giá + nút đặt ở dưới cùng */}
                <div className="flex items-end justify-between border-t border-gray-100 pt-6 mt-6">
                    <div className="space-y-1">
                        {hasFullDates ? (
                            <>
                                <span className="text-[11px] text-gray-400 uppercase font-black tracking-widest">
                                    Giá mỗi đêm (trung bình)
                                </span>
                                {isCalLoading ? (
                                    <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg" />
                                ) : (
                                    <>
                                        <div className="text-3xl font-black text-blue-600">
                                            {avgPrice.toLocaleString('vi-VN')}₫
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium">
                                            Tổng: <span className="font-bold text-gray-900">{totalAmount.toLocaleString('vi-VN')}₫</span> cho {nights} đêm
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] text-gray-400 uppercase font-black tracking-widest">Giá từ</span>
                                <div className="text-xl font-bold text-gray-400 italic">Vui lòng chọn ngày</div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-3">

                        {hasFullDates && allAvailable && isLowStock && (
                            <p className="text-xs text-red-500 font-bold text-right animate-pulse">
                                🔥 Chỉ còn {availableRooms} phòng cuối cùng!
                            </p>
                        )}
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-bold">Số phòng:</span>
                            <select
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="border-2 border-gray-100 rounded-xl px-4 py-1.5 text-sm font-bold text-gray-700 focus:border-blue-500 outline-none bg-white cursor-pointer transition-all shadow-sm"
                            >
                                {Array.from({ length: finalMaxSelectable }, (_, i) => i + 1).map(n => (
                                    <option key={n} value={n}>{n} phòng</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => onBook(room.id, quantity)}
                            disabled={hasFullDates && !allAvailable}
                            className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg ${hasFullDates
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-none'
                                } disabled:opacity-50`}
                        >
                            {hasFullDates ? 'Đặt ngay' : 'Nhập ngày'}
                        </button>

                        {hasFullDates && !allAvailable && calendarData && (
                            <p className="text-xs text-red-500 font-medium text-right max-w-[200px] leading-snug">
                                ⚠️ Phòng đang tạm đóng trong khoảng{' '}
                                {new Date(checkIn).toLocaleDateString('vi-VN')}
                                {checkIn !== calCheckOut
                                    ? ` – ${new Date(calCheckOut).toLocaleDateString('vi-VN')}`
                                    : ''}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const todayStr = new Date().toISOString().split('T')[0];
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// ── Page chính ────────────────────────────────────────────────────────────
function HotelDetailContent() {
    const router = useRouter()
    const { id } = useParams()
    const hotelId = Number(id)
    const searchParams = useSearchParams()
    const { user } = useAuthStore()
    const qc = useQueryClient()

    const checkIn = searchParams.get('checkIn') || todayStr
    const checkOut = searchParams.get('checkOut') || tomorrowStr
    const adults = Number(searchParams.get('adults') || 1)
    const rooms = Number(searchParams.get('rooms') || 1)
    const hasFullDates = !!checkIn && !!checkOut
    const children = Number(searchParams.get('children') || 0)
    const childAgesRaw = searchParams.getAll('childAges').map(Number);
    const freeChildren = childAgesRaw.filter(age => age >= 0 && age <= 5).slice(0, 1);
    const adultChildrenCount = childAgesRaw.filter(age => age >= 6).length;
    const totalEffectiveAdults = adults + adultChildrenCount;

    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [hoverRating, setHoverRating] = useState(0)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [lightboxImages, setLightboxImages] = useState<string[]>([])
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [galleryRoom, setGalleryRoom] = useState<RoomTypeResponse | null>(null)
    const [reviewPage, setReviewPage] = useState(0)
    const reviewSize = 10
    const reviewSectionRef = useRef<HTMLDivElement>(null);
    const [isSearching, startSearchTransition] = useTransition()

    const [openPanel, setOpenPanel] = useState<'ai' | 'chat' | null>(null);

    const [hotelUnreadCount, setHotelUnreadCount] = useState(0);

    const handlePageChange = (page: number) => {
        setReviewPage(page);
        reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const { data: hotel, isLoading: isHotelLoading } = useQuery({
        queryKey: ['hotel-detail', hotelId],
        queryFn: () => hotelApi.getById(hotelId).then(r => r.data),
    })

    const { data: roomTypes = [] } = useQuery({
        queryKey: ['hotel-rooms', hotelId],
        queryFn: () => roomApi.getByHotelId(hotelId).then(r => r.data),
        enabled: !!hotelId,
    })

    const { data: hotelAmenities = [] } = useQuery({
        queryKey: ['hotel-amenities', hotelId],
        queryFn: () => hotelAmenityApi.getByHotel(hotelId).then(r => r.data),
        enabled: !!hotelId,
    })

    const { data: hotelPolicy } = useQuery({
        queryKey: ['hotel-policies', hotelId],
        queryFn: () =>
            axiosInstance
                .get<HotelPolicyResponse>(`/api/hotel-policies/hotel/${hotelId}`)
                .then(r => r.data),
        enabled: !!hotelId,
    })

    const { data: relatedHotelsPage } = useQuery({
        queryKey: ['related-hotels', hotel?.district],
        queryFn: () =>
            hotelApi.search({ districts: [hotel!.district], size: 6 }).then(r => r.data),
        enabled: !!hotel?.district,
    })

    const relatedHotels = relatedHotelsPage?.content.filter(h => h.id !== hotelId) ?? []

    const { data: reviewPageData, isLoading: isReviewsLoading } = useQuery({
        queryKey: ['hotel-reviews-public', hotelId, reviewPage],
        queryFn: () =>
            axiosInstance
                .get<{ content: ReviewResponse[], totalPages: number, totalElements: number }>(
                    `/api/reviews/hotel/${hotelId}/public`,
                    {
                        params: {
                            page: reviewPage,
                            size: reviewSize
                        },
                    }
                )
                .then(r => r.data),
        enabled: !!hotelId,
    })

    const { data: allPromotions = [] } = useQuery<PromotionResponse[]>({
        queryKey: ['promotions-active'],
        queryFn: async () => {
            const response = await promotionApi.getAll()
            const data: PromotionResponse[] = response.data
            const now = new Date()
            return data.filter((p: PromotionResponse) =>
                p.isActive &&
                new Date(p.startDate) <= now &&
                new Date(p.endDate) >= now
            )
        },
    })

    const hotelPromos = useMemo(() => {
        return allPromotions.filter(p => p.hotelId === hotelId || !p.hotelId)
    }, [allPromotions, hotelId])

    const reviews = reviewPageData?.content ?? []
    const totalReviewPages = reviewPageData?.totalPages ?? 0
    const totalReviewElements = reviewPageData?.totalElements ?? 0


    const { data: myBookingsPage } = useQuery({
        queryKey: ['my-bookings-for-review', hotelId],
        queryFn: () => bookingApi.getMyBookings().then(r => r.data),
        enabled: !!user,
    })


    const myBookings = myBookingsPage?.content || []

    const eligibleBooking = myBookings.find((b: BookingResponse) => {
        const isThisHotel = b.hotelId === hotelId;
        const isCompleted = b.status === 'COMPLETED';

        const notReviewed = !b.reviewed;

        return isThisHotel && isCompleted && notReviewed;
    });

    const MAX_IMAGES = 5

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        const remaining = MAX_IMAGES - selectedFiles.length
        if (remaining <= 0) { toast.error(`Tối đa ${MAX_IMAGES} ảnh mỗi đánh giá`); return }
        const allowed = files.slice(0, remaining)
        if (files.length > remaining) toast(`Chỉ thêm được ${remaining} ảnh nữa`, { icon: '⚠️' })
        const valid = allowed.filter(f => {
            if (!f.type.startsWith('image/')) { toast.error(`${f.name} không phải ảnh hợp lệ`); return false }
            if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} vượt quá 5MB`); return false }
            return true
        })
        setSelectedFiles(prev => [...prev, ...valid])
        setPreviewUrls(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previewUrls[index])
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
        setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    }

    const openLightbox = (images: string[], startIndex: number) => {
        setLightboxImages(images); setLightboxIndex(startIndex); setLightboxOpen(true)
    }

    const resetForm = () => {
        setComment(''); setRating(5)
        previewUrls.forEach(url => URL.revokeObjectURL(url))
        setSelectedFiles([]); setPreviewUrls([])
    }

    const reviewMutation = useMutation({
        mutationFn: () => {
            const formData = new FormData()
            formData.append('data', new Blob([JSON.stringify({ bookingId: eligibleBooking?.id, rating, comment })], { type: 'application/json' }))
            selectedFiles.forEach(file => formData.append('files', file))
            return axiosInstance.post('/api/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        },
        onSuccess: () => {
            toast.success('Cảm ơn bạn đã đánh giá!')
            resetForm()
            qc.invalidateQueries({ queryKey: ['hotel-reviews-public', hotelId] })
            qc.invalidateQueries({ queryKey: ['my-bookings-for-review', hotelId] })
        },
        onError: (e: unknown) => {
            const err = e as { response?: { data?: { message?: string } } }
            toast.error(err?.response?.data?.message || 'Gửi đánh giá thất bại')
        },
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

    const handleBooking = (roomTypeId: number, quantity: number = 1) => {
        if (!hasFullDates) { handleShowPrice(); return }

        if (!user) {
            const currentUrl = `/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`
            router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
            return
        }

        const price = roomTypes.find(r => r.id === roomTypeId)?.basePrice ?? 0
        const params = new URLSearchParams({
            hotelId: hotelId.toString(),
            roomTypeId: roomTypeId.toString(),
            checkIn, checkOut,
            adults: adults.toString(),
            children: children.toString(),
            price: price.toString(),
            quantity: quantity.toString(),
        })
        router.push(`/booking?${params.toString()}`)
    }

    if (isHotelLoading) return <div className="py-20 text-center">Đang tải...</div>
    if (!hotel) return <div className="py-20 text-center">Không tìm thấy khách sạn</div>

    const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1)
        : '0.0'


    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {isSearching && (
                <div className="fixed inset-0 z-[999] bg-white/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border">
                        <Loader2 className="animate-spin text-blue-600" size={22} />
                        <span className="font-semibold text-gray-700">
                            Đang tìm phòng...
                        </span>
                    </div>
                </div>
            )}
            {/* Lightbox review ảnh */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                    <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxOpen(false)}><X size={28} /></button>
                    {lightboxImages.length > 1 && (
                        <>
                            <button className="absolute left-4 text-white p-2" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length) }}><ChevronLeft size={36} /></button>
                            <button className="absolute right-4 text-white p-2" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxImages.length) }}><ChevronRight size={36} /></button>
                        </>
                    )}
                    <img src={lightboxImages[lightboxIndex]} alt="Review image" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                    {lightboxImages.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                            {lightboxIndex + 1} / {lightboxImages.length}
                        </div>
                    )}
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white border-b sticky top-16 z-30 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <SearchBar
                        key={`search-${hotel.id}-${searchParams.toString()}`}
                        variant="compact"
                        defaultValues={{
                            checkIn, checkOut,
                            keyword: hotel.hotelName,
                            district: hotel.district,
                            adults,
                            rooms,
                            children,
                        }}
                        onSearch={(p) => {
                            startSearchTransition(() => {
                                router.replace(`/hotels/${hotelId}?${p.toString()}`)
                                router.refresh()
                            })
                        }}
                    />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-8">
                    <HotelGallery images={hotel.images || []} hotelId={hotelId} />
                </div>

                {/* Room Gallery Modal */}
                {galleryRoom && (
                    <RoomGalleryModal
                        room={galleryRoom}
                        onClose={() => setGalleryRoom(null)}
                        onBook={handleBooking}
                        hasFullDates={hasFullDates}
                        nights={nights}
                    />
                )}

                {/* ── Hotel Info + Sidebar ── */}
                {/* ── Hotel Info + Sidebar ── */}
                <div className="grid grid-cols-12 gap-6 mb-8">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {/* Hotel Info */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Khách sạn</span>
                                <div className="flex text-amber-400">
                                    {Array.from({ length: Math.round(hotel.starRating || 0) }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{hotel.hotelName}</h1>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-start gap-1 text-sm text-gray-500">
                                    <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                    <span>
                                        {hotel.addressLine}, {hotel.ward}, {hotel.district}, {hotel.city}
                                    </span>
                                </div>

                                {/* Google Map */}
                                <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                    <iframe
                                        title="hotel-map"
                                        width="100%"
                                        height="260"
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                                            `${hotel.addressLine}, ${hotel.ward}, ${hotel.district}, ${hotel.city}`
                                        )}&output=embed`}
                                        className="w-full"
                                    />
                                </div>

                                {/* Open Google Maps */}
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        `${hotel.addressLine}, ${hotel.ward}, ${hotel.district}, ${hotel.city}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    <MapPin size={16} />
                                    Xem bản đồ
                                </a>
                            </div>
                        </div>

                        {/* Mô tả */}
                        {hotel.description && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                                    <Info size={20} className="text-blue-500" /> Giới thiệu về chỗ nghỉ
                                </h3>
                                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{hotel.description}</div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-blue-900 text-lg">Đánh giá khách hàng</h4>
                                    <p className="text-xs text-gray-400">{reviews.length} bài đánh giá</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl">{avgRating}</div>
                            </div>
                            <div className="flex items-center gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill={s <= Math.round(Number(avgRating)) ? '#f59e0b' : 'none'} className={s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-200'} />)}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold mb-5 flex items-center gap-2 text-gray-900">
                                <ShieldCheck size={20} className="text-blue-600" /> Chính sách chỗ nghỉ
                            </h4>
                            {hotelPolicy ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Nhận phòng</p>
                                            <p className="text-lg font-black text-blue-700">{hotelPolicy.checkInTime}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Trả phòng</p>
                                            <p className="text-lg font-black text-gray-700">{hotelPolicy.checkOutTime}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-1">
                                        <div className="flex gap-3">
                                            <Info className="text-gray-400 shrink-0 mt-0.5" size={15} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Hủy đặt phòng</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">{hotelPolicy.cancellationPolicy}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Baby className="text-gray-400 shrink-0 mt-0.5" size={15} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Trẻ em & Giường phụ</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">{hotelPolicy.childrenPolicy}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Dog className="text-gray-400 shrink-0 mt-0.5" size={15} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Thú cưng</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">{hotelPolicy.petPolicy}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Chưa cập nhật chính sách cụ thể.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Tiện ích & Khuyến mãi (Đã đưa ra ngoài Grid Sidebar để chiếm FULL WIDTH bằng phần Chọn phòng) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
                    {/* Cột trái: Tiện ích (7/12) */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 shrink-0">
                            <CheckCircle2 size={20} className="text-blue-500" /> Tiện ích tại chỗ nghỉ
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                            {hotelAmenities.map((ha) => (
                                <div key={ha.amenityId}
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-all h-[80px]">
                                    <div className="text-blue-600 mb-1.5"><CheckCircle2 size={18} /></div>
                                    <span className="text-[11px] font-bold text-gray-700 text-center leading-tight line-clamp-2 px-1">
                                        {ha.amenityName}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cột phải: Khuyến mãi (5/12) */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 shrink-0">
                            <Tag size={20} className="text-red-500" /> Ưu đãi dành cho bạn
                        </h3>
                        {hotelPromos.length > 0 ? (
                            <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar" style={{ maxHeight: '400px' }}>
                                {hotelPromos.map((p) => (
                                    <div key={p.id} className="group relative border-2 border-dashed border-red-100 rounded-xl p-4 bg-red-50/30 hover:bg-red-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white", p.hotelId ? "bg-red-500" : "bg-blue-500")}>
                                                    {p.hotelId ? 'Mã riêng' : 'Mã sàn'}
                                                </span>
                                                <div className="font-mono font-black text-red-600 text-base mt-1 uppercase tracking-tight">{p.promoCode}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-red-600">-{p.discountPercent}%</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">Giảm giá</div>
                                            </div>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                            <p className="text-[11px] text-gray-600">Giảm tối đa <b>{p.maxDiscountAmount?.toLocaleString('vi-VN')}₫</b></p>
                                            {p.minOrderValue !== null && p.minOrderValue > 0 && (
                                                <p className="text-[10px] text-gray-400 italic">*Đơn tối thiểu {p.minOrderValue.toLocaleString('vi-VN')}₫</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(p.promoCode); toast.success('Đã sao chép mã!'); }}
                                            className="w-full py-2 bg-white border border-red-200 text-red-600 text-xs font-black rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95">
                                            SAO CHÉP MÃ
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 italic py-10">
                                <Tag size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">Hiện không có mã giảm giá nào</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Chọn phòng — FULL WIDTH ── */}
                <div id="rooms" className="space-y-4 mb-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900">Chọn phòng</h3>
                        {hasFullDates && (
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                Thời gian lưu trú: <span className="font-bold text-blue-600">{nights} đêm</span>
                            </span>
                        )}
                    </div>

                    {roomTypes.map((room) => (
                        <RoomCard
                            key={room.id}
                            adults={adults}
                            room={room}
                            hasFullDates={hasFullDates}
                            checkIn={checkIn}
                            checkOut={checkOut}
                            nights={nights}
                            onBook={handleBooking}
                            onOpenGallery={setGalleryRoom}
                            defaultRooms={rooms}
                        />
                    ))}

                    {roomTypes.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Info className="text-gray-300" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">Hiện tại khách sạn không còn phòng trống nào phù hợp.</p>
                            <p className="text-xs text-gray-400 mt-1">Vui lòng thay đổi ngày nhận/trả phòng và thử lại.</p>
                        </div>
                    )}
                </div>

                {/* ── Đánh giá — FULL WIDTH ── */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 mb-8">
                    <div
                        ref={reviewSectionRef}
                        id="reviews-section"
                        className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-50 pb-6"
                    >
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <MessageSquare size={20} className="text-blue-500" />
                                Đang hiển thị {totalReviewElements} nhận xét thực từ du khách
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">Mọi đánh giá đều từ những khách hàng đã lưu trú thực tế.</p>
                        </div>
                        {totalReviewPages > 1 && (
                            <div className="shrink-0">
                                <Pagination
                                    currentPage={reviewPage}
                                    totalPages={totalReviewPages}
                                    totalElements={totalReviewElements}
                                    pageSize={reviewSize}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </div>

                    <div className="mb-8">
                        {!user ? (
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <LogIn size={18} className="text-blue-500 shrink-0" />
                                <p className="text-sm text-blue-700">
                                    Vui lòng <button onClick={() => {
                                        const currentUrl = `/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`
                                        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
                                    }} className="font-bold underline">đăng nhập</button> và đặt phòng để gửi đánh giá.
                                </p>
                            </div>
                        ) : !eligibleBooking ? (
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                                <Info size={18} className="text-amber-500 shrink-0" />
                                <p className="text-sm text-amber-700">Bạn cần có đơn đặt phòng tại khách sạn này đã hoàn tất (sau ngày trả phòng) để gửi đánh giá.</p>
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-4 shadow-sm">
                                <p className="text-sm font-semibold text-blue-800">Chia sẻ trải nghiệm của bạn</p>
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
                                <textarea
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    rows={3}
                                    placeholder="Chia sẻ trải nghiệm của bạn về khách sạn..."
                                    className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
                                />
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-blue-700">
                                        Ảnh đính kèm <span className="font-normal text-gray-400">({selectedFiles.length}/{MAX_IMAGES} ảnh, tối đa 5MB/ảnh)</span>
                                    </p>
                                    {previewUrls.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {previewUrls.map((url, idx) => (
                                                <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-blue-200 shadow-sm">
                                                    <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover cursor-pointer" onClick={() => openLightbox(previewUrls, idx)} />
                                                    <button onClick={() => removeFile(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                                        <X size={10} className="text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                            {selectedFiles.length < MAX_IMAGES && (
                                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition-colors">
                                                    <ImagePlus size={18} /><span className="text-[10px] mt-1">Thêm</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-blue-200 rounded-xl py-4 flex flex-col items-center gap-1 text-blue-400 hover:bg-blue-50 transition-colors">
                                            <ImagePlus size={22} />
                                            <span className="text-xs font-medium">Nhấn để thêm ảnh</span>
                                            <span className="text-[10px] text-gray-400">PNG, JPG, WEBP — tối đa 5 ảnh</span>
                                        </button>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                                </div>
                                <button
                                    onClick={() => reviewMutation.mutate()}
                                    disabled={reviewMutation.isPending || !comment.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {reviewMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    {reviewMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {reviews.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-50 rounded-2xl">
                                <MessageSquare size={48} className="mx-auto mb-3 text-gray-100" />
                                <p className="font-medium">Chưa có đánh giá nào cho khách sạn này.</p>
                                <p className="text-xs mt-1">Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {reviews.map(rv => {
                                        const rvImages = rv.images?.map(img => img.imageUrl) ?? []
                                        return (
                                            <div key={rv.id} className="flex gap-4 pb-8 border-b border-gray-50 last:border-0 last:pb-0">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0 shadow-sm">
                                                    {rv.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <span className="text-base font-bold text-gray-900 block">{rv.userName}</span>
                                                            <span className="text-xs text-gray-400 italic">Đã nhận xét vào {new Date(rv.createdAt).toLocaleDateString('vi-VN')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg">
                                                            <Star size={14} fill="#f59e0b" className="text-amber-400" />
                                                            <span className="text-sm font-black text-amber-700">{Number(rv.rating).toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                    {rv.comment && <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-gray-50/50 p-4 rounded-2xl italic">{rv.comment}</p>}
                                                    {rvImages.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {rvImages.map((imgUrl, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all shadow-sm"
                                                                    onClick={() => openLightbox(rvImages, idx)}
                                                                >
                                                                    <img src={imgUrl} alt={`review-img-${idx}`} className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {rv.ownerReply && (
                                                        <div className="bg-gray-50 border-l-4 border-blue-400 rounded-r-2xl p-4 mt-4 shadow-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                                                    <ShieldCheck size={14} /> Phản hồi từ chủ khách sạn
                                                                </p>
                                                                {rv.replyDate && <span className="text-[10px] text-gray-400">{new Date(rv.replyDate).toLocaleDateString('vi-VN')}</span>}
                                                            </div>
                                                            <p className="text-sm text-gray-600 leading-relaxed">{rv.ownerReply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                {totalReviewPages > 1 && (
                                    <div className="pt-8 border-t border-gray-100 flex justify-center">
                                        <Pagination
                                            currentPage={reviewPage}
                                            totalPages={totalReviewPages}
                                            totalElements={totalReviewElements}
                                            pageSize={reviewSize}
                                            onPageChange={handlePageChange}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Khách sạn liên quan — FULL WIDTH ── */}
                {relatedHotels.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <MapPin size={20} className="text-blue-500" />
                            Khách sạn tương tự tại {hotel?.district}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {relatedHotels.map(h => (
                                <div
                                    key={h.id}
                                    onClick={() => router.push(`/hotels/${h.id}${checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}` : ''}`)}
                                    className="group cursor-pointer rounded-xl border border-gray-100 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
                                >
                                    <div className="relative h-40 bg-gray-100 overflow-hidden">
                                        {h.thumbnailUrl ? (
                                            <img src={h.thumbnailUrl} alt={h.hotelName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BedDouble size={36} className="text-gray-300" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Star size={10} fill="currentColor" className="text-amber-400" />
                                            <span>{h.starRating}</span>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">{h.hotelName}</h4>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-2">
                                            <MapPin size={11} className="text-blue-400 shrink-0" />
                                            <span className="line-clamp-1">{h.district}, {h.city}</span>
                                        </div>
                                        {h.minPrice && (
                                            <div className="text-xs">
                                                <span className="text-gray-400">Từ </span>
                                                <span className="font-bold text-blue-600">{Number(h.minPrice).toLocaleString('vi-VN')}₫</span>
                                                <span className="text-gray-400">/đêm</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-4">

                {/* Panel AI */}
                <AIChatWidget
                    panelOnly
                    externalOpen={openPanel === 'ai'}
                    onToggle={() => setOpenPanel(null)}
                />

                {/* Panel Hotel Chat */}
                <HotelChatWidget
                    hotelId={hotelId}
                    hotelName={hotel?.hotelName ?? ''}
                    hotelOwnerEmail={hotel?.ownerEmail ?? ''}
                    panelOnly
                    externalOpen={openPanel === 'chat'}
                    onToggle={() => setOpenPanel(null)}
                    onUnreadChange={setHotelUnreadCount}
                />

                {/* Thanh Bar Điều Khiển */}
                <div className="flex items-center bg-white rounded-full shadow-2xl border border-gray-200 p-1.5 backdrop-blur-md">
                    <button
                        onClick={() => setOpenPanel(openPanel === 'ai' ? null : 'ai')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all",
                            openPanel === 'ai'
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                : "text-gray-600 hover:bg-gray-100"
                        )}
                    >
                        <Bot size={18} className={openPanel === 'ai' ? "animate-bounce" : ""} />
                        <span>Hỏi Vago AI</span>
                    </button>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    <button
                        onClick={() => setOpenPanel(openPanel === 'chat' ? null : 'chat')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all relative",
                            openPanel === 'chat'
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                : "text-gray-600 hover:bg-gray-100"
                        )}
                    >
                        {/* 3. Hiển thị Badge đỏ nếu có tin nhắn chưa đọc */}
                        <div className="relative">
                            <MessageSquare size={18} />
                            {hotelUnreadCount > 0 && openPanel !== 'chat' && (
                                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-in zoom-in">
                                    {hotelUnreadCount > 9 ? '9+' : hotelUnreadCount}
                                </span>
                            )}
                        </div>
                        <span>Nhắn cho chủ khách sạn</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function HotelDetailPage() {
    return (
        <Suspense fallback={<div className="py-20 text-center">Đang tải...</div>}>
            <HotelDetailContent />
        </Suspense>
    )
}