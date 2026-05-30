'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, Tag, X, Loader2, Save,
  CheckCircle, XCircle, Search, Hotel, Calendar,
  Percent, BadgeDollarSign, Filter, ChevronDown,
} from 'lucide-react'
import promotionApi from '@/lib/api/promotion.api'
import hotelApi from '@/lib/api/hotel.api'
import { PromotionResponse } from '@/types/promotion.types'
import toast from 'react-hot-toast'

type ApiError = { response?: { data?: { message?: string } } }

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

const promoSchema = z.object({
  promoCode: z.string().min(3).max(20).regex(/^[A-Z0-9]+$/, 'Chỉ gồm chữ IN HOA và số'),
  discountPercent: z.coerce.number().min(0).max(100),
  maxDiscountAmount: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).optional(),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
  endDate: z.string().min(1, 'Chọn ngày kết thúc'),
  isActive: z.boolean(),
  hotelId: z.coerce.number().nullable(),
})

type PromoForm = z.infer<typeof promoSchema>

type FilterStatus = 'all' | 'active' | 'inactive' | 'expired'

// ── Move outside component so React Compiler can track dependencies correctly ──
function getPromoStatus(p: PromotionResponse, now: Date): FilterStatus {
  const end = new Date(p.endDate)
  const start = new Date(p.startDate)
  if (end < now) return 'expired'
  if (!p.isActive) return 'inactive'
  if (start <= now && end >= now) return 'active'
  return 'inactive'
}

export default function AdminPromotionsPage() {
  const qc = useQueryClient()
  const [modalPromo, setModalPromo] = useState<PromotionResponse | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterHotelId, setFilterHotelId] = useState<number | 'all'>('all')

  const { data: allPromos = [], isLoading: isPromosLoading } = useQuery<PromotionResponse[]>({
    queryKey: ['admin-promotions'],
    queryFn: () => promotionApi.getAll().then(r => r.data),
  })

  const { data: hotelsPage } = useQuery({
    queryKey: ['admin-hotels-all'],
    queryFn: () => hotelApi.getActive(0, 200).then(r => r.data),
  })
  const hotels = hotelsPage?.content ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => promotionApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá khuyến mãi!')
      qc.invalidateQueries({ queryKey: ['admin-promotions'] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Xoá thất bại!')
    },
  })

  const now = useMemo(() => new Date(), [])

  const filtered = useMemo(() => {
    return allPromos.filter(p => {
      const matchSearch =
        p.promoCode.toLowerCase().includes(search.toLowerCase()) ||
        (p.hotelName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || getPromoStatus(p, now) === filterStatus
      const matchHotel =
        filterHotelId === 'all'
          ? true
          : filterHotelId === 0
          ? p.hotelId === null
          : p.hotelId === filterHotelId
      return matchSearch && matchStatus && matchHotel
    })
  }, [allPromos, search, filterStatus, filterHotelId, now])

  const stats = useMemo(() => ({
    total: allPromos.length,
    active: allPromos.filter(p => getPromoStatus(p, now) === 'active').length,
    inactive: allPromos.filter(p => getPromoStatus(p, now) === 'inactive').length,
    expired: allPromos.filter(p => getPromoStatus(p, now) === 'expired').length,
  }), [allPromos, now])

  const STATUS_CONFIG: Record<FilterStatus, { label: string; color: string; bg: string; dot: string }> = {
    all:      { label: 'Tất cả',         color: 'text-gray-700',   bg: 'bg-gray-100',   dot: 'bg-gray-400' },
    active:   { label: 'Đang hoạt động', color: 'text-green-700',  bg: 'bg-green-50',   dot: 'bg-green-500' },
    inactive: { label: 'Không hoạt động',color: 'text-yellow-700', bg: 'bg-yellow-50',  dot: 'bg-yellow-500' },
    expired:  { label: 'Đã hết hạn',     color: 'text-red-700',    bg: 'bg-red-50',     dot: 'bg-red-400' },
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý khuyến mãi</h1>
          <p className="text-sm text-gray-500 mt-1">Toàn bộ mã giảm giá trên hệ thống</p>
        </div>
        <button
          onClick={() => setModalPromo('new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Tạo khuyến mãi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'all'      as const, val: stats.total,    label: 'Tất cả',          dot: 'bg-gray-400'   },
          { key: 'active'   as const, val: stats.active,   label: 'Đang hoạt động',  dot: 'bg-green-500'  },
          { key: 'inactive' as const, val: stats.inactive, label: 'Không hoạt động', dot: 'bg-yellow-500' },
          { key: 'expired'  as const, val: stats.expired,  label: 'Đã hết hạn',      dot: 'bg-red-400'    },
        ]).map(({ key, val, label, dot }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`rounded-xl border p-4 text-left transition-all ${
              filterStatus === key
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{val}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã hoặc tên khách sạn..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Hotel filter */}
        <div className="relative">
          <Hotel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filterHotelId}
            onChange={e => setFilterHotelId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="all">Tất cả khách sạn</option>
            <option value={0}>Toàn hệ thống </option>
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.hotelName}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} kết quả</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isPromosLoading ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm">Đang tải dữ liệu...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Tag size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Không tìm thấy khuyến mãi nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã KM</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách sạn</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Giảm giá</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const status = getPromoStatus(p, now)
                const cfg = STATUS_CONFIG[status]
                const daysLeft = Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / 86400000)
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                          <Tag size={14} className="text-blue-500" />
                        </div>
                        <span className="font-mono font-bold text-gray-900">{p.promoCode}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {p.hotelName ? (
                        <span className="text-gray-700 font-medium">{p.hotelName}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                          🌐 Toàn hệ thống
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-red-500 font-bold">
                          <Percent size={13} />
                          {p.discountPercent}%
                        </div>
                        <div className="text-xs text-gray-400">
                          tối đa {Number(p.maxDiscountAmount).toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                      {p.minOrderValue ? (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Đơn min: {Number(p.minOrderValue).toLocaleString('vi-VN')}₫
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} className="text-gray-400" />
                        <span>{new Date(p.startDate).toLocaleDateString('vi-VN')}</span>
                        <span className="text-gray-300">→</span>
                        <span>{new Date(p.endDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {status !== 'expired' && daysLeft > 0 && (
                        <div className={`text-xs mt-1 font-medium ${daysLeft <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                          Còn {daysLeft} ngày
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>                    
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalPromo !== null && (
        <PromoFormModal
          promo={modalPromo === 'new' ? null : modalPromo}
          hotels={hotels}
          onClose={() => setModalPromo(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin-promotions'] })
            setModalPromo(null)
          }}
        />
      )}
    </div>
  )
}

function PromoFormModal({
  promo,
  hotels,
  onClose,
  onSuccess,
}: {
  promo: PromotionResponse | null
  hotels: { id: number; hotelName: string }[]
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!promo
  const toDatetimeLocal = (iso: string) => (iso ? iso.slice(0, 16) : '')

  const saveMutation = useMutation({
    mutationFn: (data: PromoForm) => {
      // hotelId null/0/undefined => global promotion, không gửi hotelId
      const hotelId = data.hotelId && data.hotelId !== 0 ? data.hotelId : undefined
      const req = {
        promoCode: data.promoCode,
        discountPercent: data.discountPercent,
        maxDiscountAmount: data.maxDiscountAmount,
        ...(data.minOrderValue ? { minOrderValue: data.minOrderValue } : {}),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        isActive: data.isActive,
        ...(hotelId ? { hotelId } : {}),
      }
      return isEdit
        ? promotionApi.update(promo.id, req as import('@/types/promotion.types').PromotionRequest)
        : promotionApi.create(req as import('@/types/promotion.types').PromotionRequest)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Cập nhật thành công!' : 'Tạo khuyến mãi thành công!')
      onSuccess()
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Thất bại!')
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<PromoForm>({
    resolver: zodResolver(promoSchema) as Resolver<PromoForm>,
    defaultValues: {
      promoCode: promo?.promoCode ?? '',
      discountPercent: promo?.discountPercent ?? 10,
      maxDiscountAmount: promo?.maxDiscountAmount ?? 100000,
      minOrderValue: promo?.minOrderValue ?? undefined,
      startDate: promo ? toDatetimeLocal(promo.startDate) : '',
      endDate: promo ? toDatetimeLocal(promo.endDate) : '',
      isActive: promo?.isActive ?? true,
      hotelId: promo?.hotelId ?? null,
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? `Đang sửa mã: ${promo.promoCode}` : 'Điền thông tin bên dưới'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="px-6 py-5 space-y-4">

          {/* Áp dụng cho khách sạn */}
          <div>
            <label className={labelClass}>Áp dụng cho</label>
            <div className="relative">
              <Hotel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select {...register('hotelId')} className={`${inputClass} pl-8`}>
                <option value="">🌐 Toàn hệ thống </option>
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.hotelName}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Để trống = áp dụng cho tất cả khách sạn</p>
          </div>

          {/* Mã giảm giá */}
          <div>
            <label className={labelClass}>Mã giảm giá <span className="text-red-500">*</span></label>
            <input
              {...register('promoCode', {
                onChange: (e) => { e.target.value = e.target.value.toUpperCase() }
              })}
              className={inputClass}
              placeholder="VD: SUMMER30"
              style={{ textTransform: 'uppercase' }}
            />
            <p className="text-xs text-gray-400 mt-1">Chỉ dùng chữ IN HOA và số, 3-20 ký tự</p>
            {errors.promoCode && <p className="text-xs text-red-500 mt-1">{errors.promoCode.message}</p>}
          </div>

          {/* Giảm % + Tối đa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Giảm (%) <span className="text-red-500">*</span></label>
              <div className="relative">
                <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input {...register('discountPercent')} type="number" min={0} max={100} className={`${inputClass} pl-8`} />
              </div>
              {errors.discountPercent && <p className="text-xs text-red-500 mt-1">{errors.discountPercent.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Giảm tối đa (₫) <span className="text-red-500">*</span></label>
              <div className="relative">
                <BadgeDollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input {...register('maxDiscountAmount')} type="number" min={0} className={`${inputClass} pl-8`} />
              </div>
              {errors.maxDiscountAmount && <p className="text-xs text-red-500 mt-1">{errors.maxDiscountAmount.message}</p>}
            </div>
          </div>

          {/* Đơn tối thiểu */}
          <div>
            <label className={labelClass}>Đơn tối thiểu (₫)</label>
            <input {...register('minOrderValue')} type="number" min={0} className={inputClass} placeholder="Không giới hạn" />
          </div>

          {/* Ngày */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bắt đầu <span className="text-red-500">*</span></label>
              <input {...register('startDate')} type="datetime-local" className={inputClass} />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Kết thúc <span className="text-red-500">*</span></label>
              <input {...register('endDate')} type="datetime-local" className={inputClass} />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Kích hoạt */}
          <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
            <input {...register('isActive')} type="checkbox" id="isActive" className="w-4 h-4 rounded accent-blue-600" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
              Kích hoạt ngay
            </label>
            <span className="text-xs text-gray-400">Bỏ chọn để tạm ẩn mã</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}