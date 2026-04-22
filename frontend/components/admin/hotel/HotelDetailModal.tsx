'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    X, MapPin, Mail, Star, BedDouble, Users, Maximize2,
    ChevronLeft, ChevronRight, Building2, Layers, Calendar,
    Info, ImageIcon, CheckCircle2, Baby, Dog, Cigarette,
    ChevronDown, ChevronUp
} from 'lucide-react'
import { HotelResponse, HotelStatus } from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import { RoomTypeResponse } from '@/types/room.types'
import axiosInstance from '@/lib/api/axios'
import { HotelPolicyResponse } from '@/types/policy.types'
import { hotelAmenityApi, roomTypeAmenityApi } from '@/lib/api/amenity.api'
import { RoomTypeAmenityResponse } from '@/types/amenity.types'

interface Props {
    hotel: HotelResponse
    onClose: () => void
}

const STATUS_CONFIG = {
    [HotelStatus.APPROVED]: { label: 'Hoạt động', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    [HotelStatus.PENDING]: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
    [HotelStatus.REJECTED]: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700 border border-red-200' },
    [HotelStatus.DISABLED]: { label: 'Bị khóa', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
    [HotelStatus.SUSPENDED]: { label: 'Tạm ngưng', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
}

export default function HotelDetailModal({ hotel, onClose }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'policy'>('overview')
    const [imgIdx, setImgIdx] = useState(0)

    const { data: rooms = [], isLoading: roomsLoading } = useQuery({
        queryKey: ['admin-hotel-rooms', hotel.id],
        queryFn: () => roomApi.getForManagement(hotel.id).then(r => r.data),
    })

    const { data: policy } = useQuery({
        queryKey: ['admin-hotel-policy', hotel.id],
        queryFn: () =>
            axiosInstance.get<HotelPolicyResponse>(`/api/hotel-policies/hotel/${hotel.id}`).then(r => r.data),
    })

    const { data: hotelAmenities = [] } = useQuery({
        queryKey: ['admin-hotel-amenities', hotel.id],
        queryFn: () => hotelAmenityApi.getByHotel(hotel.id).then(r => r.data),
    })

    const images = hotel.images || []
    const statusCfg = STATUS_CONFIG[hotel.status]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        {hotel.thumbnailUrl ? (
                            <img src={hotel.thumbnailUrl} alt={hotel.hotelName}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Building2 size={20} className="text-blue-400" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{hotel.hotelName}</h2>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                                    {statusCfg.label}
                                </span>
                                <span className="text-xs text-gray-400">#{hotel.id}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 shrink-0">
                    {(['overview', 'rooms', 'policy'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                                activeTab === tab
                                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                        >
                            {tab === 'overview' ? 'Tổng quan' : tab === 'rooms' ? `Loại phòng (${rooms.length})` : 'Chính sách'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">

                    {/* ── Tab Tổng quan ── */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Gallery */}
                            {images.length > 0 && (
                                <div className="relative rounded-xl overflow-hidden h-56 bg-gray-100">
                                    <img src={images[imgIdx]?.imageUrl} alt="" className="w-full h-full object-cover" />
                                    {images.length > 1 && (
                                        <>
                                            <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60">
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1.5 rounded-full hover:bg-black/60">
                                                <ChevronRight size={18} />
                                            </button>
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                                                {imgIdx + 1} / {images.length}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Thông tin</h4>
                                    <InfoRow icon={<MapPin size={14} className="text-blue-500" />}
                                        label="Địa chỉ" value={`${hotel.addressLine}, ${hotel.ward}, ${hotel.district}, ${hotel.city}`} />
                                    <InfoRow icon={<Mail size={14} className="text-blue-500" />}
                                        label="Email" value={hotel.email} />
                                    <InfoRow icon={<Star size={14} className="text-amber-500" />}
                                        label="Sao" value={`${hotel.starRating || 0} sao`} />
                                    <InfoRow icon={<Calendar size={14} className="text-blue-500" />}
                                        label="Tạo lúc" value={new Date(hotel.createdAt).toLocaleDateString('vi-VN')} />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Chủ sở hữu</h4>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                                        <p className="font-semibold text-gray-900">{hotel.ownerName}</p>
                                        <p className="text-xs text-gray-400">ID: {hotel.ownerId}</p>
                                    </div>
                                    {hotel.statusReason && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Lý do</p>
                                            <p className="text-sm text-red-600">{hotel.statusReason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tiện ích khách sạn */}
                            {hotelAmenities.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                                        Tiện ích khách sạn ({hotelAmenities.length})
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {hotelAmenities.map(a => (
                                            <div key={a.amenityId}
                                                className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                                <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                                <span className="text-xs font-medium text-gray-700 truncate flex-1">{a.amenityName}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                                    a.isFree ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {a.isFree ? 'Free' : 'Phí'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {hotel.description && (
                                <div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mô tả</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{hotel.description}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab Loại phòng ── */}
                    {activeTab === 'rooms' && (
                        <div className="space-y-4">
                            {roomsLoading ? (
                                <div className="py-12 text-center text-gray-400">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                    Đang tải...
                                </div>
                            ) : rooms.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <BedDouble size={40} className="mx-auto mb-3 text-gray-200" />
                                    <p>Chưa có loại phòng nào</p>
                                </div>
                            ) : (
                                rooms.map((room: RoomTypeResponse) => (
                                    <RoomCard key={room.id} room={room} />
                                ))
                            )}
                        </div>
                    )}

                    {/* ── Tab Chính sách ── */}
                    {activeTab === 'policy' && (
                        <div className="space-y-4">
                            {!policy ? (
                                <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <Info size={40} className="mx-auto mb-3 text-gray-200" />
                                    <p>Chưa cập nhật chính sách</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Nhận phòng</p>
                                            <p className="text-2xl font-black text-blue-700">{policy.checkInTime}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Trả phòng</p>
                                            <p className="text-2xl font-black text-gray-700">{policy.checkOutTime}</p>
                                        </div>
                                    </div>
                                    {[
                                        { label: 'Hủy đặt phòng', value: policy.cancellationPolicy, icon: <Info size={14} className="text-gray-400" /> },
                                        { label: 'Trẻ em & Giường phụ', value: policy.childrenPolicy, icon: <Baby size={14} className="text-gray-400" /> },
                                        { label: 'Thú cưng', value: policy.petPolicy, icon: <Dog size={14} className="text-gray-400" /> },
                                    ].map(item => item.value && (
                                        <div key={item.label} className="bg-gray-50 rounded-xl p-4 flex gap-3">
                                            <span className="mt-0.5 shrink-0">{item.icon}</span>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{item.label}</p>
                                                <p className="text-sm text-gray-700">{item.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── RoomCard với expand tiện ích ──────────────────────────────────────────
function RoomCard({ room }: { room: RoomTypeResponse }) {
    const [expanded, setExpanded] = useState(false)
    const thumb = room.thumbnailUrl || room.images?.[0]?.imageUrl

    const { data: amenities = [], isLoading: amenitiesLoading } = useQuery({
        queryKey: ['admin-room-amenities', room.id],
        queryFn: () => roomTypeAmenityApi.getByRoomType(room.id).then(r => r.data),
        enabled: expanded, // lazy: chỉ fetch khi user mở expand
    })

    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all">
            {/* Row chính */}
            <div className="flex gap-4">
                <div className="w-32 h-28 shrink-0 bg-gray-100 flex items-center justify-center">
                    {thumb
                        ? <img src={thumb} alt={room.typeName} className="w-full h-full object-cover" />
                        : <ImageIcon size={28} className="text-gray-300" />
                    }
                </div>
                <div className="flex-1 py-3 pr-4">
                    <div className="flex items-start justify-between mb-1.5">
                        <div>
                            <h5 className="font-bold text-gray-900">{room.typeName}</h5>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                room.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {room.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                            </span>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-lg font-black text-blue-600">
                                {Number(room.basePrice).toLocaleString('vi-VN')}₫
                            </p>
                            <p className="text-[10px] text-gray-400">/đêm</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs text-gray-500 mb-2">
                        {room.maxAdults != null && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                                <Users size={11} className="text-blue-400" />
                                {room.maxAdults} NL, {room.maxChildren ?? 0} TE
                            </span>
                        )}
                        {room.roomSize != null && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                                <Maximize2 size={11} className="text-blue-400" /> {room.roomSize}m²
                            </span>
                        )}
                        {room.bedType && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                                <BedDouble size={11} className="text-blue-400" /> {room.bedType}
                            </span>
                        )}
                        {room.totalRooms != null && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                                <Layers size={11} className="text-blue-400" /> {room.totalRooms} phòng
                            </span>
                        )}
                        {room.isNonSmoking != null && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                                <Cigarette size={11} className={room.isNonSmoking ? 'text-red-400' : 'text-gray-400'} />
                                {room.isNonSmoking ? 'Không hút thuốc' : 'Cho phép hút thuốc'}
                            </span>
                        )}
                    </div>

                    {room.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 italic mb-2">{room.description}</p>
                    )}

                    {/* Toggle tiện ích */}
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                    >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {expanded ? 'Ẩn tiện ích phòng' : 'Xem tiện ích phòng'}
                    </button>
                </div>
            </div>

            {/* Panel tiện ích — lazy expand */}
            {expanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tiện ích loại phòng</p>
                    {amenitiesLoading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            Đang tải...
                        </div>
                    ) : amenities.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-1">Chưa có tiện ích nào cho phòng này.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {amenities.map((a: RoomTypeAmenityResponse) => (
                                <div key={a.amenityId}
                                    className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 shadow-sm">
                                    <CheckCircle2 size={12} className="text-blue-400 shrink-0" />
                                    <span className="text-xs text-gray-700 truncate flex-1">{a.amenityName}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                        a.isFree ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                        {a.isFree ? 'Free' : 'Phí'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                <p className="text-sm text-gray-700">{value}</p>
            </div>
        </div>
    )
}