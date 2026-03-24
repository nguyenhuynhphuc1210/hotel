'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { UserResponse } from '@/types/user.types'
import { useUpdateUser } from '@/hooks/useUser'

const schema = z.object({
  fullName: z.string().min(1, 'Họ tên không được để trống'),
  phone: z.string().regex(/^\d{10}$/, 'Số điện thoại phải có 10 chữ số').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  roleId: z.coerce.number().min(1, 'Vui lòng chọn role'),
  // password để trống = không đổi
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự').optional().or(z.literal('')),
  email: z.string(), // giữ lại để gửi lên BE nhưng disable input
  avatarUrl: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  user: UserResponse | null
  onClose: () => void
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function UserEditModal({ user, onClose }: Props) {
  const updateMutation = useUpdateUser(user?.id ?? '')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { roleId: 3 },
  })

  // Load dữ liệu user vào form khi mở
  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        fullName: user.fullName,
        phone: user.phone ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
        gender: user.gender ?? undefined,
        roleId: user.roleId,
        password: '',
        avatarUrl: user.avatarUrl ?? '',
      })
    }
  }, [user, reset])

  if (!user) return null

  const onSubmit = async (data: FormValues) => {
    await updateMutation.mutateAsync({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.gender,
      roleId: data.roleId,
      // Chỉ gửi password nếu có nhập
      password: data.password || 'KEEP_UNCHANGED',
      avatarUrl: data.avatarUrl || undefined,
    })
    onClose()
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sửa thông tin người dùng</h2>
            <p className="text-xs text-gray-400 mt-0.5">#{user.id} · {user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Email — disabled, không cho sửa */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              {...register('email')}
              disabled
              className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
          </div>

          {/* Họ tên */}
          <div>
            <label className={labelClass}>Họ tên <span className="text-red-500">*</span></label>
            <input {...register('fullName')} className={inputClass} placeholder="Nguyễn Văn A" />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
          </div>

          {/* Phone + Giới tính */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Số điện thoại</label>
              <input {...register('phone')} className={inputClass} placeholder="0901234567" />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Giới tính</label>
              <select {...register('gender')} className={`${inputClass} bg-white`}>
                <option value="">-- Chọn --</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          {/* Ngày sinh */}
          <div>
            <label className={labelClass}>Ngày sinh</label>
            <input {...register('dateOfBirth')} type="date" className={inputClass} />
          </div>

          {/* Role */}
          <div>
            <label className={labelClass}>Role <span className="text-red-500">*</span></label>
            <select
              {...register('roleId')}
              className={`${inputClass} bg-white`}
            >
              <option value={1}>Admin</option>
              <option value={2}>Chủ khách sạn</option>
              <option value={3}>Khách hàng</option>
            </select>
            {errors.roleId && <p className="text-xs text-red-500 mt-1">{errors.roleId.message}</p>}
          </div>

          {/* Mật khẩu mới (tuỳ chọn) */}
          <div>
            <label className={labelClass}>Mật khẩu mới</label>
            <input
              {...register('password')}
              type="password"
              className={inputClass}
              placeholder="Để trống nếu không đổi"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
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
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}