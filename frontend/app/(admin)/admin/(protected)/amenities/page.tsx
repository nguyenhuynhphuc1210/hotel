'use client'

import { useState } from 'react'
import {
  useAmenities,
  useCreateAmenity,
  useUpdateAmenity,
  useDeleteAmenity,
} from '@/hooks/useAmenity'
import { AmenityResponse, AmenityType } from '@/types/amenity.types'
import {
  Plus, Pencil, Trash2, Search, X, Loader2,
  Sparkles, Building2, BedDouble, Tag, ChevronRight,
  Grid3X3, List, Filter
} from 'lucide-react'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  amenityName: z.string().min(1, 'Tên tiện ích không được để trống'),
  iconUrl: z.string().optional(),
  type: z.enum(['HOTEL', 'ROOM'] as const),
})
type FormValues = z.infer<typeof schema>

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_CONFIG = {
  ALL:   { label: 'Tất cả',      icon: Grid3X3,   color: 'indigo' },
  HOTEL: { label: 'Khách sạn',   icon: Building2, color: 'emerald' },
  ROOM:  { label: 'Loại phòng',  icon: BedDouble, color: 'violet' },
} as const

type TabKey = keyof typeof TAB_CONFIG

const TYPE_BADGE: Record<AmenityType, { label: string; bg: string; text: string; dot: string }> = {
  HOTEL: { label: 'Khách sạn', bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-400' },
  ROOM:  { label: 'Loại phòng', bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-400'  },
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAmenitiesPage() {
  const { data: amenities = [], isLoading } = useAmenities()
  const deleteMutation = useDeleteAmenity()

  const [keyword, setKeyword]         = useState('')
  const [activeTab, setActiveTab]     = useState<TabKey>('ALL')
  const [openModal, setOpenModal]     = useState(false)
  const [editingItem, setEditingItem] = useState<AmenityResponse | null>(null)
  const [viewMode, setViewMode]       = useState<'grid' | 'list'>('grid')

  const hotelCount = amenities.filter(a => a.type === 'HOTEL').length
  const roomCount  = amenities.filter(a => a.type === 'ROOM').length

  const filtered = amenities.filter(a => {
    const matchKeyword = a.amenityName.toLowerCase().includes(keyword.toLowerCase())
    const matchTab = activeTab === 'ALL' || a.type === activeTab
    return matchKeyword && matchTab
  })

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
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-1">
              <span>Quản lý</span>
              <ChevronRight size={12} />
              <span className="text-gray-600">Tiện ích</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tiện ích hệ thống</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Quản lý tiện ích cho khách sạn và loại phòng
            </p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setOpenModal(true) }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-all duration-150"
          >
            <Plus size={15} strokeWidth={2.5} />
            Thêm tiện ích
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tất cả',      count: amenities.length, icon: Tag,       bg: 'bg-indigo-500', light: 'bg-indigo-50',  text: 'text-indigo-600' },
            { label: 'Khách sạn',   count: hotelCount,       icon: Building2, bg: 'bg-emerald-500',light: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Loại phòng',  count: roomCount,        icon: BedDouble, bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-600' },
          ].map(({ label, count, icon: Icon, bg, light, text }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${light} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={text} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs + Search + View Toggle ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-100 px-4 gap-1">
            {(Object.entries(TAB_CONFIG) as [TabKey, typeof TAB_CONFIG[TabKey]][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-3.5 text-sm font-medium border-b-2 transition-all duration-150 -mb-px ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={14} />
                  {cfg.label}
                  <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {key === 'ALL' ? amenities.length : key === 'HOTEL' ? hotelCount : roomCount}
                  </span>
                </button>
              )
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-56 my-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tiện ích..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
              {keyword && (
                <button onClick={() => setKeyword('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden my-2 ml-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Đang tải...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Search size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Không tìm thấy tiện ích nào</p>
                <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
              </div>
            ) : viewMode === 'grid' ? (
              <GridView
                items={filtered}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deletingId={deleteMutation.isPending ? undefined : undefined}
              />
            ) : (
              <ListView
                items={filtered}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* Footer count */}
          {!isLoading && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Hiển thị <span className="font-semibold text-gray-600">{filtered.length}</span> / {amenities.length} tiện ích
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {openModal && (
          <AmenityModal
            item={editingItem}
            defaultType={activeTab === 'ALL' ? 'HOTEL' : activeTab}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  )
}

// ─── Grid View ─────────────────────────────────────────────────────────────────

function GridView({
  items,
  onEdit,
  onDelete,
}: {
  items: AmenityResponse[]
  onEdit: (a: AmenityResponse) => void
  onDelete: (a: AmenityResponse) => void
  deletingId?: number
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map(a => {
        const badge = TYPE_BADGE[a.type]
        return (
          <div
            key={a.id}
            className="group relative bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all duration-200 p-4"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                a.type === 'HOTEL' ? 'bg-emerald-50' : 'bg-violet-50'
              }`}>
                {a.iconUrl ? (
                  <img src={a.iconUrl} alt={a.amenityName} className="w-6 h-6 object-contain" />
                ) : a.type === 'HOTEL' ? (
                  <Building2 size={18} className="text-emerald-500" />
                ) : (
                  <BedDouble size={18} className="text-violet-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{a.amenityName}</p>
                <p className="text-xs text-gray-400 mt-0.5">ID #{a.id}</p>
              </div>
            </div>

            {/* Badge + Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(a)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Chỉnh sửa"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(a)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Xoá"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── List View ─────────────────────────────────────────────────────────────────

function ListView({
  items,
  onEdit,
  onDelete,
}: {
  items: AmenityResponse[]
  onEdit: (a: AmenityResponse) => void
  onDelete: (a: AmenityResponse) => void
}) {
  return (
    <div className="divide-y divide-gray-50 -mx-4">
      {/* Header row */}
      <div className="grid grid-cols-[auto_1fr_140px_100px] items-center gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <span className="w-9" />
        <span>Tên tiện ích</span>
        <span>Loại</span>
        <span className="text-right">Hành động</span>
      </div>

      {items.map(a => {
        const badge = TYPE_BADGE[a.type]
        return (
          <div
            key={a.id}
            className="group grid grid-cols-[auto_1fr_140px_100px] items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              a.type === 'HOTEL' ? 'bg-emerald-50' : 'bg-violet-50'
            }`}>
              {a.iconUrl ? (
                <img src={a.iconUrl} alt={a.amenityName} className="w-5 h-5 object-contain" />
              ) : a.type === 'HOTEL' ? (
                <Building2 size={15} className="text-emerald-500" />
              ) : (
                <BedDouble size={15} className="text-violet-500" />
              )}
            </div>

            {/* Name */}
            <div>
              <p className="text-sm font-medium text-gray-900">{a.amenityName}</p>
              <p className="text-xs text-gray-400">#{a.id}</p>
            </div>

            {/* Badge */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${badge.bg} ${badge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(a)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(a)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

function AmenityModal({
  item,
  defaultType,
  onClose,
}: {
  item: AmenityResponse | null
  defaultType: AmenityType
  onClose: () => void
}) {
  const isEdit = !!item
  const createMutation = useCreateAmenity()
  const updateMutation = useUpdateAmenity(item?.id ?? '')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      amenityName: item?.amenityName ?? '',
      iconUrl:     item?.iconUrl ?? '',
      type:        item?.type ?? defaultType,
    },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: FormValues) => {
    if (isEdit) {
      await updateMutation.mutateAsync(data)
    } else {
      await createMutation.mutateAsync(data)
    }
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const typeOptions: { value: AmenityType; label: string; icon: React.ElementType; desc: string; ring: string; bg: string; text: string }[] = [
    {
      value: 'HOTEL',
      label: 'Khách sạn',
      icon: Building2,
      desc: 'Tiện ích chung của toàn khách sạn',
      ring: 'ring-emerald-400',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      value: 'ROOM',
      label: 'Loại phòng',
      icon: BedDouble,
      desc: 'Tiện ích riêng cho từng loại phòng',
      ring: 'ring-violet-400',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Chỉnh sửa tiện ích' : 'Thêm tiện ích mới'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? `Đang sửa: ${item.amenityName}` : 'Điền thông tin để tạo tiện ích'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

          {/* Type selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Loại tiện ích <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map(opt => {
                const Icon = opt.icon
                const isSelected = selectedType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('type', opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                      isSelected
                        ? `border-transparent ring-2 ${opt.ring} ${opt.bg}`
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/70' : 'bg-white'}`}>
                      <Icon size={16} className={isSelected ? opt.text : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? opt.text : 'text-gray-600'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 leading-tight mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tên tiện ích <span className="text-red-500">*</span>
            </label>
            <input
              {...register('amenityName')}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-300"
              placeholder="VD: Wifi miễn phí, Hồ bơi, Minibar..."
            />
            {errors.amenityName && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <X size={11} />
                {errors.amenityName.message}
              </p>
            )}
          </div>

          {/* Icon URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL Icon</label>
            <input
              {...register('iconUrl')}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-300"
              placeholder="https://example.com/icon.svg"
            />
            <p className="text-xs text-gray-400 mt-1.5">Để trống để dùng icon mặc định theo loại</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-150 disabled:opacity-60 ${
                selectedType === 'HOTEL'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  : 'bg-violet-600 hover:bg-violet-700 shadow-violet-200'
              }`}
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