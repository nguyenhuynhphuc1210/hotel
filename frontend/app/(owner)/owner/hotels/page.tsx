'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Plus, Clock, CheckCircle2, ChevronDown,
    ChevronUp, Save, Loader2, Building2, AlertCircle,
} from 'lucide-react'
import hotelApi, { HotelResponse, PageResponse } from '@/lib/api/hotel.api'
import toast from 'react-hot-toast'
import { useOwnerHotel } from '../../owner-hotel-context'

type ApiError = { response?: { data?: { message?: string } } }

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const textareaClass = `${inputClass} resize-none`

const hotelSchema = z.object({
    hotelName: z.string().min(1, 'Không được để trống'),
    description: z.string().optional(),
    addressLine: z.string().min(1, 'Không được để trống'),
    ward: z.string().min(1, 'Không được để trống'),
    district: z.string().min(1, 'Không được để trống'),
    city: z.string().default('TP Hồ Chí Minh'),
    phone: z.string().regex(/^\d{10,11}$/, 'Số điện thoại 10-11 chữ số'),
    email: z.string().email('Email không đúng định dạng'),
})
type HotelForm = z.infer<typeof hotelSchema>

// ── Status badge ──────────────────────────────────────────
function StatusBadge({ isActive }: { isActive: boolean }) {
    if (isActive) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
                <CheckCircle2 size={13} /> Đã duyệt · Đang hoạt động
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            <Clock size={13} /> Chờ admin duyệt
        </span>
    )
}

// ── Page ──────────────────────────────────────────────────
export default function OwnerMyHotelsPage() {
    const qc = useQueryClient()
    
    // Ép kiểu dữ liệu từ context để tránh lỗi 'never'
    const { hotels, isLoading } = useOwnerHotel() as { 
        hotels: PageResponse<HotelResponse> | HotelResponse[] | null, 
        isLoading: boolean 
    }

    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    const createMutation = useMutation({
        mutationFn: (data: HotelForm) => hotelApi.create(data),
        onSuccess: () => {
            toast.success('Đã gửi đăng ký! Vui lòng chờ Admin duyệt.')
            qc.invalidateQueries({ queryKey: ['owner-hotels-list'] })
            setShowForm(false)
            reset()
        },
        onError: (e: unknown) => {
            const err = e as ApiError
            toast.error(err?.response?.data?.message || 'Đăng ký thất bại!')
        },
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<HotelForm>({
        resolver: zodResolver(hotelSchema) as Resolver<HotelForm>,
        defaultValues: { city: 'TP Hồ Chí Minh' },
    })

    if (isLoading) {
        return <div className="py-20 text-center text-gray-400">Đang tải...</div>
    }

    // ✅ FIX: Trích xuất mảng khách sạn an toàn (Dùng Type Guard)
    let hotelList: HotelResponse[] = []
    if (hotels) {
        if (Array.isArray(hotels)) {
            hotelList = hotels
        } else if ('content' in hotels) {
            hotelList = hotels.content
        }
    }

    const pendingHotels = hotelList.filter((h: HotelResponse) => !h.isActive)
    const approvedHotels = hotelList.filter((h: HotelResponse) => h.isActive)

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Khách sạn của tôi</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {approvedHotels.length} đang hoạt động · {pendingHotels.length} chờ duyệt
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} />
                    Đăng ký khách sạn mới
                </button>
            </div>

            {/* ── Form đăng ký ── */}
            {showForm && (
                <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <Building2 size={18} className="text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">Đăng ký khách sạn mới</h2>
                    </div>

                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-0.5">Lưu ý quan trọng</p>
                            <p className="text-xs">Sau khi đăng ký, khách sạn sẽ ở trạng thái <strong>Chờ duyệt</strong> cho đến khi Admin xét duyệt.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Tên khách sạn <span className="text-red-500">*</span></label>
                                <input {...register('hotelName')} className={inputClass} placeholder="VD: Khách Sạn Sài Gòn Pearl" />
                                {errors.hotelName && <p className="text-xs text-red-500 mt-1">{errors.hotelName.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Mô tả</label>
                                <textarea {...register('description')} rows={1} className={textareaClass} placeholder="Mô tả ngắn..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Email khách sạn <span className="text-red-500">*</span></label>
                                <input {...register('email')} type="email" className={inputClass} placeholder="contact@hotel.com" />
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Số điện thoại <span className="text-red-500">*</span></label>
                                <input {...register('phone')} className={inputClass} placeholder="0901234567" />
                                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Địa chỉ <span className="text-red-500">*</span></label>
                            <input {...register('addressLine')} className={inputClass} placeholder="Số nhà, tên đường..." />
                            {errors.addressLine && <p className="text-xs text-red-500 mt-1">{errors.addressLine.message}</p>}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Phường/Xã <span className="text-red-500">*</span></label>
                                <input {...register('ward')} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Quận/Huyện <span className="text-red-500">*</span></label>
                                <input {...register('district')} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Thành phố</label>
                                <input {...register('city')} className={inputClass} readOnly />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => { setShowForm(false); reset() }}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                                Huỷ
                            </button>
                            <button type="submit" disabled={createMutation.isPending}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Gửi đăng ký
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Chờ duyệt ── */}
            {pendingHotels.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Clock size={14} className="text-amber-500" /> Đang chờ duyệt ({pendingHotels.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingHotels.map((h: HotelResponse) => (
                            <HotelCard key={h.id} hotel={h} expanded={expandedId === h.id}
                                onToggle={() => setExpandedId(expandedId === h.id ? null : h.id)} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Đã duyệt ── */}
            {approvedHotels.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500" /> Đang hoạt động ({approvedHotels.length})
                    </h2>
                    <div className="space-y-3">
                        {approvedHotels.map((h: HotelResponse) => (
                            <HotelCard key={h.id} hotel={h} expanded={expandedId === h.id}
                                onToggle={() => setExpandedId(expandedId === h.id ? null : h.id)} />
                        ))}
                    </div>
                </div>
            )}

            {/* ✅ Empty state - Dùng hotelList.length */}
            {hotelList.length === 0 && !showForm && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
                    <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Bạn chưa có khách sạn nào</p>
                    <button onClick={() => setShowForm(true)}
                        className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Đăng ký ngay
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Hotel Card ────────────────────────────────────────────
function HotelCard({ hotel, expanded, onToggle }: {
    hotel: HotelResponse
    expanded: boolean
    onToggle: () => void
}) {
    const primaryImage = hotel.thumbnailUrl || hotel.images?.find(i => i.isPrimary)?.imageUrl

    return (
        <div className={`bg-white rounded-xl border overflow-hidden transition-all ${hotel.isActive ? 'border-gray-200' : 'border-amber-200'}`}>
            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {primaryImage
                        ? <img src={primaryImage} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🏨</div>
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{hotel.hotelName}</h3>
                        <StatusBadge isActive={hotel.isActive} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{hotel.addressLine}, {hotel.district}</p>
                </div>

                <button className="p-1.5 text-gray-400">
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                            { label: 'Email', value: hotel.email },
                            { label: 'SĐT', value: hotel.phone },
                            { label: 'Địa chỉ', value: `${hotel.addressLine}, ${hotel.ward}, ${hotel.district}` },
                            { label: 'Ngày đăng ký', value: new Date(hotel.createdAt).toLocaleDateString('vi-VN') },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                                <div className="font-medium text-gray-800 truncate">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}