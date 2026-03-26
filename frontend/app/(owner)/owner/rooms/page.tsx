'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, X, Loader2, Save,
  BedDouble, Users, Maximize2, Upload, Star,
  ChevronRight,
} from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import { RoomTypeResponse, RoomImageResponse } from '@/types/room.types'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { useOwnerHotel } from '../../owner-hotel-context'

type ApiError = { response?: { data?: { message?: string } } }

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const textareaClass = `${inputClass} resize-none`

const roomSchema = z.object({
  typeName: z.string().min(1, 'Tên loại phòng không được để trống'),
  description: z.string().optional(),
  maxAdults: z.coerce.number().min(1, 'Tối thiểu 1 người lớn'),
  maxChildren: z.coerce.number().min(0),
  bedType: z.string().optional(),
  roomSize: z.coerce.number().min(0).optional(),
  basePrice: z.coerce.number().min(1000, 'Giá tối thiểu 1,000₫'),
  totalRooms: z.coerce.number().min(1, 'Tổng số phòng tối thiểu là 1'),
})

type RoomForm = z.infer<typeof roomSchema>

export default function OwnerRoomsPage() {
  const qc = useQueryClient()
  const [modalRoom, setModalRoom] = useState<RoomTypeResponse | null | 'new'>(null)
  const [imageRoom, setImageRoom] = useState<RoomTypeResponse | null>(null)

  // 1. Lấy thông tin khách sạn đang được chọn từ Context toàn cục
  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  // 2. Lấy danh sách room types dựa trên activeHotelId từ Context
  const { data: allRooms = [], isLoading: isRoomsLoading } = useQuery({
    queryKey: ['owner-rooms', activeHotelId],
    queryFn: async () => {
      // 1. Kiểm tra nếu chưa có ID thì trả về mảng rỗng ngay lập tức
      if (!activeHotelId) return [];

      // 2. Lúc này TypeScript hiểu activeHotelId chắc chắn là number
      const r = await roomApi.getByHotelId(activeHotelId);
      return r.data;
    },
    // Giữ nguyên enabled để query không tự chạy khi chưa có ID
    enabled: !!activeHotelId,
  })



  // 3. Xử lý xóa phòng
  const deleteMutation = useMutation({
    mutationFn: (id: number) => roomApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá loại phòng!')
      qc.invalidateQueries({ queryKey: ['owner-rooms', activeHotelId] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Xoá thất bại!')
    },
  })

  const handleDelete = (room: RoomTypeResponse) => {
    if (confirm(`Xoá loại phòng "${room.typeName}"?`)) {
      deleteMutation.mutate(room.id)
    }
  }

  // Loading tổng hợp
  if (isHotelLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Đang tải thông tin khách sạn...
      </div>
    )
  }

  // Trường hợp owner chưa có khách sạn nào
  if (!activeHotel) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Chưa có khách sạn nào được chọn hoặc gán cho tài khoản này
      </div>
    )
  }

  // Gán biến hotel bằng activeHotel để các phần code bên dưới (phần return) không bị lỗi reference
  const hotel = activeHotel;
  const isLoading = isRoomsLoading;



  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý loại phòng</h1>
          <p className="text-sm text-gray-500 mt-1">{hotel.hotelName} · {allRooms.length} loại phòng</p>
        </div>
        <button
          onClick={() => setModalRoom('new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Thêm loại phòng
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : allRooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <BedDouble size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có loại phòng nào</p>
          <p className="text-gray-400 text-sm mt-1">Thêm loại phòng để khách có thể đặt</p>
          <button onClick={() => setModalRoom('new')}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Thêm ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allRooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={() => setModalRoom(room)}
              onDelete={() => handleDelete(room)}
              onManageImages={() => setImageRoom(room)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {modalRoom !== null && (
        <RoomFormModal
          room={modalRoom === 'new' ? null : modalRoom}
          hotelId={hotel.id}
          qc={qc}
          onClose={() => setModalRoom(null)}
        />
      )}

      {/* Image Modal */}
      {imageRoom && (
        <RoomImageModal
          room={imageRoom}
          qc={qc}
          onClose={() => setImageRoom(null)}
        />
      )}

    </div>
  )
}

// ─── Room Card ────────────────────────────────────────────
function RoomCard({ room, onEdit, onDelete, onManageImages, isDeleting }: {
  room: RoomTypeResponse
  onEdit: () => void
  onDelete: () => void
  onManageImages: () => void
  isDeleting: boolean
}) {
  const displayImage = room.thumbnailUrl || room.images?.find(i => i.isPrimary)?.imageUrl;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group flex flex-col">
      {/* ── Phần ảnh (Giống Home) ── */}
      <div
        className="relative h-48 bg-gray-100 overflow-hidden cursor-pointer"
        onClick={onManageImages}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={room.typeName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <BedDouble size={32} />
            <span className="text-xs">Chưa có ảnh</span>
          </div>
        )}

        {/* Badge số lượng ảnh (Overlay) */}
        {/* <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
          <Upload size={10} /> {room.images?.length || 0} ảnh
        </div> */}

        {/* Nút thao tác nhanh khi hover */}
        <div className="absolute top-3 right-3 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-white/90 hover:bg-white text-blue-600 rounded-full shadow-sm"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            className="p-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-full shadow-sm disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Phần nội dung ── */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {room.typeName}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">
            {room.description || 'Chưa có mô tả cho loại phòng này.'}
          </p>
        </div>

        {/* Tags tiện ích nhỏ */}
        <div className="flex flex-wrap gap-3 py-3 border-y border-gray-50 my-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Users size={13} className="text-gray-400" />
            <span>{room.maxAdults}L {room.maxChildren ? `, ${room.maxChildren}T` : ''}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Maximize2 size={13} className="text-gray-400" />
            <span>{room.roomSize}m²</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <BedDouble size={13} className="text-gray-400" />
            <span className="truncate max-w-[80px]">{room.bedType}</span>
          </div>
        </div>

        {/* Giá và Nút chi tiết */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Giá mỗi đêm</span>
            <div className="text-blue-600 font-black text-base">
              {Number(room.basePrice).toLocaleString('vi-VN')}₫
            </div>
          </div>
          <button
            onClick={onManageImages}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter flex items-center gap-1"
          >
            Quản lý ảnh <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Room Form Modal ──────────────────────────────────────
function RoomFormModal({ room, hotelId, qc, onClose }: {
  room: RoomTypeResponse | null
  hotelId: number
  qc: QueryClient
  onClose: () => void
}) {
  const isEdit = !!room

  const saveMutation = useMutation({
    mutationFn: (data: RoomForm) => {
      const req = { ...data, hotelId }
      console.log('hotelId prop:', hotelId)
      console.log('Sending request:', req)
      return isEdit
        ? roomApi.update(room.id, req)
        : roomApi.create(req)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Cập nhật thành công!' : 'Tạo loại phòng thành công!')
      qc.invalidateQueries({ queryKey: ['owner-rooms', hotelId] })
      onClose()
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      console.log('Backend error:', JSON.stringify(err?.response?.data))
      toast.error(err?.response?.data?.message || 'Thất bại!')
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<RoomForm>({
    resolver: zodResolver(roomSchema) as Resolver<RoomForm>,
    defaultValues: {
      typeName: room?.typeName ?? '',
      description: room?.description ?? '',
      maxAdults: room?.maxAdults ?? 2,
      maxChildren: room?.maxChildren ?? 0,
      bedType: room?.bedType ?? '',
      roomSize: room?.roomSize ?? undefined,
      basePrice: room?.basePrice ?? 500000,
      totalRooms: room?.totalRooms ?? 1,
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? `Sửa: ${room.typeName}` : 'Thêm loại phòng mới'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="px-6 py-5 space-y-4">

          <div>
            <label className={labelClass}>Tên loại phòng <span className="text-red-500">*</span></label>
            <input {...register('typeName')} className={inputClass} placeholder="VD: Deluxe Double, Superior Twin..." />
            {errors.typeName && <p className="text-xs text-red-500 mt-1">{errors.typeName.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Mô tả</label>
            <textarea {...register('description')} rows={3} className={textareaClass}
              placeholder="Mô tả ngắn về loại phòng..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tối đa người lớn <span className="text-red-500">*</span></label>
              <input {...register('maxAdults')} type="number" min={1} max={10} className={inputClass} />
              {errors.maxAdults && <p className="text-xs text-red-500 mt-1">{errors.maxAdults.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Tổng số phòng <span className="text-red-500">*</span></label>
              <input {...register('totalRooms')} type="number" min={1} className={inputClass} placeholder="VD: 10" />
              {errors.totalRooms && <p className="text-xs text-red-500 mt-1">{errors.totalRooms.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Tối đa trẻ em</label>
              <input {...register('maxChildren')} type="number" min={0} max={10} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Loại giường</label>
              <select {...register('bedType')} className={`${inputClass} bg-white`}>
                <option value="">-- Chọn --</option>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Twin">Twin</option>
                <option value="King">King</option>
                <option value="Queen">Queen</option>
                <option value="Bunk">Bunk</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Diện tích (m²)</label>
              <input {...register('roomSize')} type="number" min={0} className={inputClass} placeholder="VD: 25" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Giá cơ bản / đêm (₫) <span className="text-red-500">*</span></label>
            <input {...register('basePrice')} type="number" min={0} className={inputClass} placeholder="VD: 500000" />
            {errors.basePrice && <p className="text-xs text-red-500 mt-1">{errors.basePrice.message}</p>}
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
              {isEdit ? 'Lưu thay đổi' : 'Tạo phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Room Image Modal ─────────────────────────────────────
function RoomImageModal({ room, qc, onClose }: {
  room: RoomTypeResponse
  qc: QueryClient
  onClose: () => void
}) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('roomTypeId', String(room.id))
      files.forEach(f => form.append('files', f))
      await axiosInstance.post(API_CONFIG.ENDPOINTS.ROOM_IMAGES_UPLOAD, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Upload ảnh thành công!')
      qc.invalidateQueries({ queryKey: ['owner-rooms'] })
    } catch {
      toast.error('Upload thất bại!')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (publicId: string) => {
    if (!confirm('Xoá ảnh này?')) return
    try {
      await axiosInstance.delete(API_CONFIG.ENDPOINTS.ROOM_IMAGES_DELETE, {
        params: { publicId }
      })
      toast.success('Đã xoá ảnh!')
      qc.invalidateQueries({ queryKey: ['owner-rooms'] })
    } catch {
      toast.error('Xoá thất bại!')
    }
  }

  const handleSetPrimary = async (id: number) => {
    try {
      await axiosInstance.put(API_CONFIG.ENDPOINTS.ROOM_IMAGE_SET_PRIMARY(id))
      toast.success('Đã đặt làm ảnh chính!')
      qc.invalidateQueries({ queryKey: ['owner-rooms'] })
    } catch {
      toast.error('Thất bại!')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Ảnh phòng: {room.typeName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{room.images?.length ?? 0} ảnh</p>
          </div>
          <div className="flex items-center gap-2">
            <label className={`flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!room.images?.length ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400 text-sm">
              Chưa có ảnh nào
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {room.images.map((img: RoomImageResponse) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200">
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                  {img.isPrimary && (
                    <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star size={9} fill="white" /> Chính
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.isPrimary && (
                      <button onClick={() => handleSetPrimary(img.id)}
                        className="p-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                        <Star size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(String(img.id))}
                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}