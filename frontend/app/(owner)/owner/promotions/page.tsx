'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Tag, X, Loader2, Save, CheckCircle, XCircle } from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import promotionApi from '@/lib/api/promotion.api'
import { PromotionResponse } from '@/types/promotion.types'
import toast from 'react-hot-toast'
import { useOwnerHotel } from '../../owner-hotel-context'

type ApiError = { response?: { data?: { message?: string } } }

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

const promoSchema = z.object({
  promoCode:        z.string().min(3).max(20).regex(/^[A-Z0-9]+$/, 'Chỉ gồm chữ IN HOA và số'),
  discountPercent:  z.coerce.number().min(0).max(100),
  maxDiscountAmount:z.coerce.number().min(0),
  minOrderValue:    z.coerce.number().min(0).optional(),
  startDate:        z.string().min(1, 'Chọn ngày bắt đầu'),
  endDate:          z.string().min(1, 'Chọn ngày kết thúc'),
  isActive:         z.boolean(),
})

type PromoForm = z.infer<typeof promoSchema>

export default function OwnerPromotionsPage() {
  const qc = useQueryClient()
  const [modalPromo, setModalPromo] = useState<PromotionResponse | null | 'new'>(null)

  // 1. Lấy thông tin từ Context
  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  // 2. Lấy danh sách KM dựa trên activeHotelId
  const { data: allPromos = [], isLoading: isPromosLoading } = useQuery({
    queryKey: ['owner-promotions', activeHotelId],
    queryFn: () => promotionApi.getAll().then(r =>
      r.data.filter((p: PromotionResponse) => p.hotelId === activeHotelId)
    ),
    enabled: !!activeHotelId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => promotionApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá khuyến mãi!')
      qc.invalidateQueries({ queryKey: ['owner-promotions', activeHotelId] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Xoá thất bại!')
    },
  })

  const hotel = activeHotel
  const isLoading = isPromosLoading || isHotelLoading

  const now = new Date()
  const activePromos = allPromos.filter((p: PromotionResponse) =>
    p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now
  )

  if (!hotel && !isHotelLoading) return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý khuyến mãi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hotel?.hotelName} · {activePromos.length} đang hoạt động
          </p>
        </div>
        <button onClick={() => setModalPromo('new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tạo khuyến mãi
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : allPromos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Tag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có khuyến mãi nào</p>
          <button onClick={() => setModalPromo('new')}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allPromos.map((p: PromotionResponse) => {
            const isActive = p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now
            const daysLeft = Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / 86400000)
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Tag size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-gray-900">{p.promoCode}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <XCircle size={10} /> Không hoạt động
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModalPromo(p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => confirm(`Xoá mã "${p.promoCode}"?`) && deleteMutation.mutate(p.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-400">Giảm</div>
                    <div className="font-bold text-red-500 text-lg">{p.discountPercent}%</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-400">Tối đa</div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {Number(p.maxDiscountAmount).toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {new Date(p.startDate).toLocaleDateString('vi-VN')} →{' '}
                    {new Date(p.endDate).toLocaleDateString('vi-VN')}
                  </span>
                  {daysLeft > 0 ? (
                    <span className={daysLeft <= 3 ? 'text-red-500 font-medium' : 'text-gray-400'}>
                      Còn {daysLeft} ngày
                    </span>
                  ) : (
                    <span className="text-gray-400">Đã hết hạn</span>
                  )}
                </div>

                {p.minOrderValue && (
                  <div className="mt-2 text-xs text-gray-400">
                    Đơn tối thiểu: {Number(p.minOrderValue).toLocaleString('vi-VN')}₫
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalPromo !== null && (
        <PromoFormModal
          promo={modalPromo === 'new' ? null : modalPromo}
          hotelId={hotel?.id ?? 0}
          qc={qc}
          onClose={() => setModalPromo(null)}
        />
      )}
    </div>
  )
}

function PromoFormModal({ promo, hotelId, qc, onClose }: {
  promo: PromotionResponse | null
  hotelId: number
  qc: ReturnType<typeof useQueryClient>
  onClose: () => void
}) {
  const isEdit = !!promo

  const toDatetimeLocal = (iso: string) => iso ? iso.slice(0, 16) : ''

  const saveMutation = useMutation({
    mutationFn: (data: PromoForm) => {
      const req = {
        ...data,
        hotelId,
        startDate: new Date(data.startDate).toISOString(),
        endDate:   new Date(data.endDate).toISOString(),
      }
      return isEdit
        ? promotionApi.update(promo.id, req)
        : promotionApi.create(req)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Cập nhật thành công!' : 'Tạo khuyến mãi thành công!')
      qc.invalidateQueries({ queryKey: ['owner-promotions', hotelId] })
      onClose()
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Thất bại!')
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<PromoForm>({
    resolver: zodResolver(promoSchema) as Resolver<PromoForm>,
    defaultValues: {
      promoCode:         promo?.promoCode         ?? '',
      discountPercent:   promo?.discountPercent    ?? 10,
      maxDiscountAmount: promo?.maxDiscountAmount  ?? 100000,
      minOrderValue:     promo?.minOrderValue      ?? undefined,
      startDate:         promo ? toDatetimeLocal(promo.startDate) : '',
      endDate:           promo ? toDatetimeLocal(promo.endDate)   : '',
      isActive:          promo?.isActive           ?? true,
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="px-6 py-5 space-y-4">

          <div>
            <label className={labelClass}>Mã giảm giá <span className="text-red-500">*</span></label>
            <input {...register('promoCode')} className={inputClass}
              placeholder="VD: SUMMER30" style={{ textTransform: 'uppercase' }} />
            <p className="text-xs text-gray-400 mt-1">Chỉ dùng chữ IN HOA và số, 3-20 ký tự</p>
            {errors.promoCode && <p className="text-xs text-red-500 mt-1">{errors.promoCode.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Giảm (%) <span className="text-red-500">*</span></label>
              <input {...register('discountPercent')} type="number" min={0} max={100} className={inputClass} />
              {errors.discountPercent && <p className="text-xs text-red-500 mt-1">{errors.discountPercent.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Giảm tối đa (₫) <span className="text-red-500">*</span></label>
              <input {...register('maxDiscountAmount')} type="number" min={0} className={inputClass} />
              {errors.maxDiscountAmount && <p className="text-xs text-red-500 mt-1">{errors.maxDiscountAmount.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Đơn tối thiểu (₫)</label>
            <input {...register('minOrderValue')} type="number" min={0} className={inputClass} placeholder="Không giới hạn" />
          </div>

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

          <div className="flex items-center gap-3 py-2">
            <input {...register('isActive')} type="checkbox" id="isActive"
              className="w-4 h-4 rounded accent-blue-600" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              Kích hoạt ngay
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Huỷ
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saveMutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Save size={14} />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}