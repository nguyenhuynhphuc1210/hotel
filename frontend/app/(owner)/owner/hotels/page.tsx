'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Plus, Clock, CheckCircle2, ChevronDown,
    ChevronUp, Save, Loader2, Building2, AlertCircle,
    PauseCircle, PlayCircle, XCircle,
} from 'lucide-react'
import hotelApi, { HotelResponse, HotelStatus, PageResponse } from '@/lib/api/hotel.api'
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
function StatusBadge({ status }: { status: HotelStatus }) {
    switch (status) {
        case HotelStatus.APPROVED:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
                    <CheckCircle2 size={13} /> Đã duyệt · Đang hoạt động
                </span>
            )
        case HotelStatus.PENDING:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                    <Clock size={13} /> Chờ admin duyệt
                </span>
            )
        case HotelStatus.SUSPENDED:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                    <PauseCircle size={13} /> Tạm ngưng
                </span>
            )
        case HotelStatus.REJECTED:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
                    <XCircle size={13} /> Bị từ chối
                </span>
            )
        case HotelStatus.DISABLED:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-semibold">
                    <AlertCircle size={13} /> Đã bị khóa
                </span>
            )
        default:
            return null
    }
}

// ── Suspend Modal ─────────────────────────────────────────
function SuspendModal({
    hotel,
    onClose,
    onConfirm,
    isPending,
}: {
    hotel: HotelResponse
    onClose: () => void
    onConfirm: (reason: string) => void
    isPending: boolean
}) {
    const [reason, setReason] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                        <PauseCircle size={22} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Tạm ngưng khách sạn</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{hotel.hotelName}</p>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">Lưu ý khi tạm ngưng:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                        <li>Khách sạn sẽ ẩn khỏi danh sách tìm kiếm</li>
                        <li>Tất cả phòng sẽ tạm thời không nhận đặt mới</li>
                        <li>Bạn có thể tự kích hoạt lại bất cứ lúc nào</li>
                    </ul>
                </div>

                <div>
                    <label className={labelClass}>
                        Lý do tạm ngưng <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                    </label>
                    <textarea
                        rows={3}
                        className={textareaClass}
                        placeholder="VD: Đang sửa chữa, nâng cấp cơ sở vật chất..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={isPending}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <PauseCircle size={14} />}
                        Xác nhận tạm ngưng
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────
export default function OwnerMyHotelsPage() {
    const qc = useQueryClient()

    const { hotels, isLoading } = useOwnerHotel() as {
        hotels: PageResponse<HotelResponse> | HotelResponse[] | null,
        isLoading: boolean
    }

    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [suspendTarget, setSuspendTarget] = useState<HotelResponse | null>(null)

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

    const suspendMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            hotelApi.suspend(id, reason),
        onSuccess: () => {
            toast.success('Đã tạm ngưng khách sạn.')
            qc.invalidateQueries({ queryKey: ['owner-hotels-list'] })
            setSuspendTarget(null)
        },
        onError: (e: unknown) => {
            const err = e as ApiError
            toast.error(err?.response?.data?.message || 'Tạm ngưng thất bại!')
        },
    })

    const reactivateMutation = useMutation({
        mutationFn: (id: number) => hotelApi.reactivate(id),
        onSuccess: () => {
            toast.success('Đã kích hoạt lại khách sạn!')
            qc.invalidateQueries({ queryKey: ['owner-hotels-list'] })
        },
        onError: (e: unknown) => {
            const err = e as ApiError
            toast.error(err?.response?.data?.message || 'Kích hoạt thất bại!')
        },
    })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<HotelForm>({
        resolver: zodResolver(hotelSchema) as Resolver<HotelForm>,
        defaultValues: { city: 'TP Hồ Chí Minh' },
    })

    if (isLoading) {
        return <div className="py-20 text-center text-gray-400">Đang tải...</div>
    }

    let hotelList: HotelResponse[] = []
    if (hotels) {
        if (Array.isArray(hotels)) {
            hotelList = hotels
        } else if ('content' in hotels) {
            hotelList = hotels.content
        }
    }

    const approvedHotels = hotelList.filter(h => h.status === HotelStatus.APPROVED)
    const suspendedHotels = hotelList.filter(h => h.status === HotelStatus.SUSPENDED)
    const pendingHotels = hotelList.filter(h => h.status === HotelStatus.PENDING)
    const otherHotels = hotelList.filter(h =>
        h.status === HotelStatus.REJECTED || h.status === HotelStatus.DISABLED
    )

    const sharedProps = {
        expandedId,
        setExpandedId,
        onSuspend: setSuspendTarget,
        onReactivate: (id: number) => reactivateMutation.mutate(id),
        reactivatingId: reactivateMutation.isPending ? reactivateMutation.variables as number : null,
    }

    return (
        <div className="space-y-6">

            {/* Suspend Modal */}
            {suspendTarget && (
                <SuspendModal
                    hotel={suspendTarget}
                    onClose={() => setSuspendTarget(null)}
                    onConfirm={(reason) => suspendMutation.mutate({ id: suspendTarget.id, reason })}
                    isPending={suspendMutation.isPending}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Khách sạn của tôi</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {approvedHotels.length} đang hoạt động · {pendingHotels.length} chờ duyệt · {suspendedHotels.length} tạm ngưng
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

            {/* ── Đang hoạt động ── */}
            {approvedHotels.length > 0 && (
                <HotelSection title="Đang hoạt động" count={approvedHotels.length}
                    icon={<CheckCircle2 size={14} className="text-green-500" />}
                    hotels={approvedHotels} {...sharedProps} />
            )}

            {/* ── Tạm ngưng ── */}
            {suspendedHotels.length > 0 && (
                <HotelSection title="Đang tạm ngưng" count={suspendedHotels.length}
                    icon={<PauseCircle size={14} className="text-blue-500" />}
                    hotels={suspendedHotels} {...sharedProps} />
            )}

            {/* ── Chờ duyệt ── */}
            {pendingHotels.length > 0 && (
                <HotelSection title="Đang chờ duyệt" count={pendingHotels.length}
                    icon={<Clock size={14} className="text-amber-500" />}
                    hotels={pendingHotels} {...sharedProps} />
            )}

            {/* ── Bị từ chối / Bị khóa ── */}
            {otherHotels.length > 0 && (
                <HotelSection title="Từ chối / Bị khóa" count={otherHotels.length}
                    icon={<XCircle size={14} className="text-red-400" />}
                    hotels={otherHotels} {...sharedProps} />
            )}

            {/* Empty state */}
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

// ── Hotel Section ─────────────────────────────────────────
function HotelSection({
    title, count, icon, hotels, expandedId, setExpandedId, onSuspend, onReactivate, reactivatingId,
}: {
    title: string
    count: number
    icon: React.ReactNode
    hotels: HotelResponse[]
    expandedId: number | null
    setExpandedId: (id: number | null) => void
    onSuspend: (hotel: HotelResponse) => void
    onReactivate: (id: number) => void
    reactivatingId: number | null
}) {
    return (
        <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                {icon} {title} ({count})
            </h2>
            <div className="space-y-3">
                {hotels.map(h => (
                    <HotelCard
                        key={h.id}
                        hotel={h}
                        expanded={expandedId === h.id}
                        onToggle={() => setExpandedId(expandedId === h.id ? null : h.id)}
                        onSuspend={() => onSuspend(h)}
                        onReactivate={() => onReactivate(h.id)}
                        isReactivating={reactivatingId === h.id}
                    />
                ))}
            </div>
        </div>
    )
}

// ── Hotel Card ────────────────────────────────────────────
function HotelCard({
    hotel, expanded, onToggle, onSuspend, onReactivate, isReactivating,
}: {
    hotel: HotelResponse
    expanded: boolean
    onToggle: () => void
    onSuspend: () => void
    onReactivate: () => void
    isReactivating: boolean
}) {
    const primaryImage = hotel.thumbnailUrl || hotel.images?.find(i => i.isPrimary)?.imageUrl

    const borderColor: Record<HotelStatus, string> = {
        [HotelStatus.APPROVED]: 'border-gray-200',
        [HotelStatus.PENDING]: 'border-amber-200',
        [HotelStatus.SUSPENDED]: 'border-blue-200',
        [HotelStatus.REJECTED]: 'border-red-200',
        [HotelStatus.DISABLED]: 'border-gray-300',
    }

    return (
        <div className={`bg-white rounded-xl border overflow-hidden transition-all ${borderColor[hotel.status] ?? 'border-gray-200'}`}>
            {/* Header */}
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
                        <StatusBadge status={hotel.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{hotel.addressLine}, {hotel.district}</p>
                </div>

                <button className="p-1.5 text-gray-400 shrink-0">
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {/* Expanded */}
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

                    {/* Lý do */}
                    {hotel.statusReason && (
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                            <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs text-blue-500 font-medium mb-0.5">Lý do</div>
                                <div className="text-xs text-blue-700">{hotel.statusReason}</div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                        {hotel.status === HotelStatus.APPROVED && (
                            <button
                                onClick={onSuspend}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                            >
                                <PauseCircle size={14} /> Tạm ngưng
                            </button>
                        )}

                        {hotel.status === HotelStatus.SUSPENDED && (
                            <button
                                onClick={onReactivate}
                                disabled={isReactivating}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-60 transition-colors"
                            >
                                {isReactivating
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <PlayCircle size={14} />
                                }
                                Kích hoạt lại
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}