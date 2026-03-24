'use client'

import { useState } from 'react'
import { useAmenities, useCreateAmenity, useUpdateAmenity, useDeleteAmenity } from '@/hooks/useAmenity'
import { AmenityResponse } from '@/types/amenity.types'
import { Plus, Pencil, Trash2, Search, X, Loader2, Sparkles } from 'lucide-react'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  amenityName: z.string().min(1, 'Tên tiện ích không được để trống'),
  iconUrl:     z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function AdminAmenitiesPage() {
  const { data: amenities = [], isLoading } = useAmenities()
  const createMutation = useCreateAmenity()
  const deleteMutation = useDeleteAmenity()

  const [keyword, setKeyword]             = useState('')
  const [openModal, setOpenModal]         = useState(false)
  const [editingItem, setEditingItem]     = useState<AmenityResponse | null>(null)

  const filtered = amenities.filter(a =>
    a.amenityName.toLowerCase().includes(keyword.toLowerCase())
  )

  const handleEdit = (a: AmenityResponse) => {
    setEditingItem(a)
    setOpenModal(true)
  }

  const handleDelete = (a: AmenityResponse) => {
    if (confirm(`Xoá tiện ích "${a.amenityName}"?`)) {
      deleteMutation.mutate(a.id)
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false)
    setEditingItem(null)
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tiện ích</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng: {amenities.length} tiện ích</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setOpenModal(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Thêm tiện ích
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm tên tiện ích..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Không tìm thấy tiện ích nào</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(a => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                {a.iconUrl ? (
                  <img src={a.iconUrl} alt={a.amenityName} className="w-6 h-6 object-contain" />
                ) : (
                  <Sparkles size={18} className="text-blue-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">{a.amenityName}</div>
                <div className="text-xs text-gray-400 mt-0.5">#{a.id}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(a)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create / Edit */}
      {openModal && (
        <AmenityModal
          item={editingItem}
          onClose={handleCloseModal}
        />
      )}

    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────
function AmenityModal({
  item,
  onClose,
}: {
  item: AmenityResponse | null
  onClose: () => void
}) {
  const isEdit = !!item
  const createMutation = useCreateAmenity()
  const updateMutation = useUpdateAmenity(item?.id ?? '')

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      amenityName: item?.amenityName ?? '',
      iconUrl:     item?.iconUrl ?? '',
    },
  })

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Sửa tiện ích' : 'Thêm tiện ích mới'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          <div>
            <label className={labelClass}>Tên tiện ích <span className="text-red-500">*</span></label>
            <input
              {...register('amenityName')}
              className={inputClass}
              placeholder="VD: Wifi miễn phí, Hồ bơi, Bãi đỗ xe..."
            />
            {errors.amenityName && <p className="text-xs text-red-500 mt-1">{errors.amenityName.message}</p>}
          </div>

          <div>
            <label className={labelClass}>URL Icon</label>
            <input
              {...register('iconUrl')}
              className={inputClass}
              placeholder="https://example.com/icon.png"
            />
            <p className="text-xs text-gray-400 mt-1">Để trống nếu dùng icon mặc định</p>
          </div>

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
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Lưu thay đổi' : 'Tạo tiện ích'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}