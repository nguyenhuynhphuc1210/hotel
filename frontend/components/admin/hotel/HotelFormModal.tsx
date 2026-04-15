'use client'

import { useEffect } from 'react'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { HotelResponse } from '@/lib/api/hotel.api'
import { useCreateHotel, useUpdateHotel } from '@/hooks/useHotel'
import { useUsers } from '@/hooks/useUser'

const schema = z.object({
  hotelName: z.string().min(1, 'Tên khách sạn không được để trống').max(255),
  description: z.string().optional(),
  addressLine: z.string().min(1, 'Địa chỉ không được để trống'),
  ward: z.string().min(1, 'Phường/Xã không được để trống'),
  district: z.string().min(1, 'Quận/Huyện không được để trống'),
  city: z.string().min(1, 'Tỉnh/Thành phố không được để trống'),
  phone: z.string().regex(/^\d{10,11}$/, 'Số điện thoại phải từ 10-11 chữ số'),
  email: z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
  ownerId: z.number({ message: 'Vui lòng chọn chủ sở hữu' }).min(1, 'Vui lòng chọn chủ sở hữu'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  hotel?: HotelResponse | null
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function HotelFormModal({ open, onClose, hotel }: Props) {
  const isEdit = !!hotel
  const createMutation = useCreateHotel()
  const updateMutation = useUpdateHotel(hotel?.id ?? '')

  const { data: pageData } = useUsers(0, 100)
  const users = pageData?.content || []
  const owners = users.filter((u) => u.roleName === 'ROLE_HOTEL_OWNER')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { city: 'TP Hồ Chí Minh' },
  })

  useEffect(() => {
    if (hotel) {
      reset({
        hotelName: hotel.hotelName,
        description: hotel.description ?? '',
        addressLine: hotel.addressLine,
        ward: hotel.ward,
        district: hotel.district,
        city: hotel.city,
        phone: hotel.phone,
        email: hotel.email,
        ownerId: hotel.ownerId,
      })
    } else {
      reset({
        city: 'TP Hồ Chí Minh',
        hotelName: '',
        description: '',
        addressLine: '',
        ward: '',
        district: '',
        phone: '',
        email: '',
        ownerId: undefined,
      })
    }
  }, [hotel, open, reset])

  if (!open) return null

  const onSubmit = async (data: FormValues) => {
    if (isEdit) {
      await updateMutation.mutateAsync(data)
    } else {
      await createMutation.mutateAsync(data)
    }
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? `Sửa: ${hotel.hotelName}` : 'Thêm khách sạn mới'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? `#${hotel.id}` : 'Điền đầy đủ thông tin bên dưới'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="px-6 py-5 space-y-5">

          {/* Thông tin cơ bản */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Thông tin cơ bản</p>
            <div className="space-y-3">

              <div>
                <label className={labelClass}>Tên khách sạn <span className="text-red-500">*</span></label>
                <input {...register('hotelName')} className={inputClass} placeholder="VD: Khách sạn Sài Gòn" />
                {errors.hotelName && <p className="text-xs text-red-500 mt-1">{errors.hotelName.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Mô tả</label>
                <textarea {...register('description')} rows={3} className={inputClass} placeholder="Mô tả ngắn về khách sạn..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Email — tự động điền khi chọn owner */}
                <div>
                  <label className={labelClass}>
                    Email <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">(tự điền khi chọn chủ)</span>
                  </label>
                  <input
                    {...register('email')}
                    type="text"
                    className={inputClass}
                    placeholder="Chọn chủ KS để tự điền..."
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Số điện thoại <span className="text-red-500">*</span></label>
                  <input {...register('phone')} className={inputClass} placeholder="0901234567" />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>
              </div>

            </div>
          </div>

          {/* Địa chỉ */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Địa chỉ</p>
            <div className="space-y-3">

              <div>
                <label className={labelClass}>Số nhà, tên đường <span className="text-red-500">*</span></label>
                <input {...register('addressLine')} className={inputClass} placeholder="VD: 123 Nguyễn Huệ" />
                {errors.addressLine && <p className="text-xs text-red-500 mt-1">{errors.addressLine.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Phường/Xã <span className="text-red-500">*</span></label>
                  <input {...register('ward')} className={inputClass} placeholder="VD: P. Bến Nghé" />
                  {errors.ward && <p className="text-xs text-red-500 mt-1">{errors.ward.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Quận/Huyện <span className="text-red-500">*</span></label>
                  <input {...register('district')} className={inputClass} placeholder="VD: Quận 1" />
                  {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Thành phố <span className="text-red-500">*</span></label>
                  <input {...register('city')} className={inputClass} />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>
              </div>

            </div>
          </div>

          {/* Chủ sở hữu */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Chủ sở hữu</p>
            <div>
              <label className={labelClass}>
                Chủ khách sạn <span className="text-red-500">*</span>
              </label>
              <select
                {...register('ownerId', { valueAsNumber: true })}
                className={`${inputClass} bg-white`}
                onChange={e => {
                  const selectedId = Number(e.target.value)
                  setValue('ownerId', selectedId)
                  // Tự động điền email của owner vào ô email khách sạn
                  const selectedOwner = owners.find(o => o.id === selectedId)
                  if (selectedOwner) {
                    setValue('email', selectedOwner.email, { shouldValidate: true })
                  }
                }}
              >
                <option value="">-- Chọn chủ khách sạn --</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.fullName}
                  </option>
                ))}
              </select>
              {errors.ownerId && <p className="text-xs text-red-500 mt-1">{errors.ownerId.message}</p>}
              {owners.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Chưa có tài khoản chủ khách sạn nào. Hãy tạo user với role Chủ KS trước.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo khách sạn'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}