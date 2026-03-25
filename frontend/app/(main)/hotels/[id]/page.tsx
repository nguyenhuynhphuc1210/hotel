'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import {
    MapPin, Star, Share2, Heart, Info,
    CheckCircle2, Utensils, Wifi, ParkingCircle,
    Users, Maximize2, BedDouble, Clock, ShieldCheck, Baby, Dog
} from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import { hotelAmenityApi } from '@/lib/api/amenity.api'
import policyApi from '@/lib/api/policy.api'
import reviewApi from '@/lib/api/review.api'
import SearchBar from '@/components/common/SearchBar'

export default function HotelDetailPage() {
    const { id } = useParams()
    const hotelId = Number(id)
    const searchParams = useSearchParams()

    const checkIn = searchParams.get('checkIn') || ''
    const checkOut = searchParams.get('checkOut') || ''
    const adults = Number(searchParams.get('adults') || 2)

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

    // 3. Tiện ích (Sửa: dùng ha.amenityId và ha.amenityName theo DTO)
    const { data: hotelAmenities = [] } = useQuery({
        queryKey: ['hotel-amenities', hotelId],
        queryFn: () => hotelAmenityApi.getByHotel(hotelId).then(r => r.data),
        enabled: !!hotelId
    })

    // 4. Chính sách (Sửa: DTO có checkInTime, cancellationPolicy... không có policyName)
    const { data: policies = [] } = useQuery({
        queryKey: ['hotel-policies', hotelId],
        queryFn: () => policyApi.getAll().then(r => r.data.filter(p => p.hotelId === hotelId)),
        enabled: !!hotelId
    })

    // 5. Đánh giá thật để tính điểm trung bình
    const { data: reviews = [] } = useQuery({
        queryKey: ['hotel-reviews', hotelId],
        queryFn: () => reviewApi.getAll().then(r => r.data.filter(rev => Number(rev.id) === hotelId)), // Giả định logic filter nếu api chưa có getByHotel
        enabled: !!hotelId
    })

    if (isHotelLoading) return <div className="py-20 text-center">Đang tải...</div>
    if (!hotel) return <div className="py-20 text-center">Không tìm thấy khách sạn</div>

    const images = hotel.images || []
    const mainImage = images.find(img => img.isPrimary)?.imageUrl || images[0]?.imageUrl
    const subImages = images.filter(img => img.imageUrl !== mainImage).slice(0, 4)

    // Tính điểm trung bình thật
    const avgRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
        : "0.0"

    const hotelPolicy = policies[0]; // Thường mỗi khách sạn chỉ có 1 bản ghi chính sách

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
                <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[450px] rounded-xl overflow-hidden mb-8 shadow-sm">
                    <div className="col-span-2 row-span-2 relative group cursor-pointer">
                        <img src={mainImage} className="w-full h-full object-cover" alt="Main" />
                    </div>
                    {subImages.map((img, idx) => (
                        <div key={idx} className="relative group cursor-pointer">
                            <img src={img.imageUrl} className="w-full h-full object-cover" alt={`Sub ${idx}`} />
                            {idx === 3 && images.length > 5 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-lg">+ {images.length - 5} ảnh</div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 space-y-8">
                        {/* Hotel Info */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Khách sạn</span>
                                <div className="flex text-amber-400">
                                    {Array.from({ length: Math.round(hotel.starRating || 0) }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{hotel.hotelName}</h1>
                            <div className="flex items-start gap-1 text-sm text-gray-500">
                                <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>{hotel.addressLine}, {hotel.ward}, {hotel.district}, {hotel.city}</span>
                            </div>
                        </div>

                        {/* Facilities - SỬA LẠI TRƯỜNG DỮ LIỆU */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-lg mb-6">Tiện ích tại chỗ nghỉ</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {hotelAmenities.map((ha) => (
                                    <div key={ha.amenityId} className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors">
                                        <div className="w-8 h-8 flex items-center justify-center text-blue-600 mb-2">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-700 text-center">{ha.amenityName}</span>
                                        {ha.isFree ? 
                                            <span className="text-[9px] text-emerald-600 font-bold uppercase mt-1">Miễn phí</span> :
                                            <span className="text-[9px] text-amber-600 font-bold uppercase mt-1">Có phí</span>
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Room Selection */}
                        <div id="rooms" className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">Chọn phòng</h3>
                            {roomTypes.map((room) => (
                                <div key={room.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex shadow-sm hover:border-blue-300 transition-all">
                                    <div className="w-72 h-52 shrink-0 relative">
                                        <img src={room.thumbnailUrl || room.images?.[0]?.imageUrl} className="w-full h-full object-cover" alt={room.typeName} />
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900 mb-2">{room.typeName}</h4>
                                            <div className="flex gap-4 text-xs text-gray-500 mb-3 font-medium">
                                                <div className="flex items-center gap-1"><Users size={14}/> {room.maxAdults}L, {room.maxChildren}T</div>
                                                <div className="flex items-center gap-1"><Maximize2 size={14}/> {room.roomSize} m²</div>
                                                <div className="flex items-center gap-1"><BedDouble size={14}/> {room.bedType}</div>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-2 italic">{room.description}</p>
                                        </div>
                                        <div className="flex items-end justify-between border-t pt-4">
                                            <div>
                                                <span className="text-[10px] text-gray-400 uppercase font-bold">Giá mỗi đêm từ</span>
                                                <div className="text-2xl font-black text-blue-600">{Number(room.basePrice).toLocaleString('vi-VN')}₫</div>
                                            </div>
                                            <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-100">Đặt phòng</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="col-span-4 space-y-6">
                        {/* Rating Real Data */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-blue-900 text-lg">Đánh giá khách hàng</h4>
                                    <p className="text-xs text-gray-400">{reviews.length} bài đánh giá</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl">{avgRating}</div>
                            </div>
                            <button className="w-full py-2.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">Xem tất cả</button>
                        </div>

                        {/* Policies - SỬA THEO DTO THẬT */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold mb-5 flex items-center gap-2 text-gray-900"><ShieldCheck size={20} className="text-blue-600" /> Chính sách chỗ nghỉ</h4>
                            
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