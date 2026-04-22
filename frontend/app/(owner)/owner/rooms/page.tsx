'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, X, Loader2, Save,
  BedDouble, Users, Maximize2, Upload, Star,
  ChevronRight, Sparkles, CheckCircle2, Settings2,
  AlertCircle,
  CigaretteOff,
  Clock, Power, Play, Pause
} from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import { roomTypeAmenityApi } from '@/lib/api/amenity.api'
import { useAmenities } from '@/hooks/useAmenity'
import { RoomTypeResponse, RoomImageResponse } from '@/types/room.types'
import { RoomTypeAmenityResponse } from '@/types/amenity.types'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { useOwnerHotel } from '../../owner-hotel-context'
import { RoomImageModal } from './RoomImageModal'
import Link from 'next/link'


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
  isNonSmoking: z.boolean().default(true),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
})

type RoomForm = z.infer<typeof roomSchema>

export default function OwnerRoomsPage() {
  const qc = useQueryClient()
  const [modalRoom, setModalRoom] = useState<RoomTypeResponse | null | 'new'>(null)
  const [imageRoom, setImageRoom] = useState<RoomTypeResponse | null>(null)
  const [amenityRoom, setAmenityRoom] = useState<RoomTypeResponse | null>(null)

  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  const { data: allRooms = [], isLoading: isRoomsLoading } = useQuery({
    queryKey: ['owner-rooms', activeHotelId],
    queryFn: async () => {
      if (!activeHotelId) return []
      const r = await roomApi.getForManagement(activeHotelId)
      return r.data
    },
    enabled: !!activeHotelId,
  })

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

  const toggleStatusMutation = useMutation({
    mutationFn: (room: RoomTypeResponse) => {
      return room.isActive
        ? roomApi.suspend(room.id)
        : roomApi.reactivate(room.id)
    },
    onSuccess: (_, room) => {
      toast.success(room.isActive ? 'Đã tạm ngưng kinh doanh' : 'Đã kích hoạt kinh doanh trở lại')
      qc.invalidateQueries({ queryKey: ['owner-rooms', activeHotelId] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Thao tác thất bại!')
    },
  })


  const handleDelete = (room: RoomTypeResponse) => {
    if (confirm(`Xoá loại phòng "${room.typeName}"?`)) {
      deleteMutation.mutate(room.id)
    }
  }

  if (isHotelLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Đang tải thông tin khách sạn...
      </div>
    )
  }

  if (!activeHotel) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Chưa có khách sạn nào được chọn hoặc gán cho tài khoản này
      </div>
    )
  }

  const hotel = activeHotel
  const isLoading = isRoomsLoading

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý loại phòng</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hotel.hotelName} · {allRooms.length} loại phòng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="rooms/trash"
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Trash2 size={16} /> Thùng rác
          </Link>

          <button
            onClick={() => setModalRoom('new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Thêm loại phòng
          </button>
        </div>
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
              onManageAmenities={() => setAmenityRoom(room)}
              isDeleting={deleteMutation.isPending}
              onToggleStatus={() => toggleStatusMutation.mutate(room)}
              isToggling={toggleStatusMutation.isPending}
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
          onClose={() => setImageRoom(null)}
        />
      )}

      {/* ── Amenity Modal (NEW) ── */}
      {amenityRoom && (
        <RoomTypeAmenityModal
          room={amenityRoom}
          qc={qc}
          onClose={() => setAmenityRoom(null)}
        />
      )}
    </div>
  )
}

// ─── Room Card ────────────────────────────────────────────

function RoomCard({
  room,
  onEdit,
  onDelete,
  onManageImages,
  onManageAmenities,
  isDeleting,
  onToggleStatus,
  isToggling
}: {
  room: RoomTypeResponse
  onEdit: () => void
  onDelete: () => void
  onManageImages: () => void
  onManageAmenities: () => void
  isDeleting: boolean
  onToggleStatus: () => void
  isToggling: boolean
}) {
  const displayImage = room.thumbnailUrl || room.images?.find(i => i.isPrimary)?.imageUrl

  return (
    <div className={`bg-white rounded-2xl border transition-all group flex flex-col relative overflow-hidden ${
      room.isActive 
        ? 'border-gray-200 hover:shadow-lg' 
        : 'border-gray-100 bg-gray-50/50 shadow-none' // Làm mờ border và đổi nền nếu tạm ngưng
    }`}>

      {/* Badge Trạng thái ở góc trái */}
      <div className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md ${
        room.isActive
          ? 'bg-green-500/90 text-white'
          : 'bg-gray-400/90 text-white' // Màu xám cho tạm ngưng
        }`}>
        {room.isActive ? <CheckCircle2 size={10} /> : <Pause size={10} />}
        {room.isActive ? 'ĐANG KINH DOANH' : 'TẠM NGƯNG'}
      </div>

      {/* ── Ảnh ── */}
      <div
        className="relative h-48 bg-gray-100 overflow-hidden cursor-pointer"
        onClick={onManageImages}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={room.typeName}
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
              !room.isActive && 'grayscale opacity-40' // Ảnh xám và mờ đi khi tạm ngưng
            }`}
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${!room.isActive ? 'text-gray-300' : 'text-gray-400'}`}>
            <BedDouble size={32} />
            <span className="text-xs">Chưa có ảnh</span>
          </div>
        )}

        {/* Action buttons on hover */}
        <div className="absolute top-3 right-3 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus() }}
            disabled={isToggling}
            title={room.isActive ? 'Tạm ngưng kinh doanh' : 'Kích hoạt kinh doanh'}
            className={`p-2 bg-white rounded-full shadow-lg transition-colors ${
              room.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'
            }`}
          >
            {isToggling ? <Loader2 size={14} className="animate-spin" /> : room.isActive ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-lg transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            disabled={isDeleting}
            className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-full shadow-lg disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Nội dung ── */}
      <div className={`p-4 flex-1 flex flex-col ${!room.isActive ? 'opacity-60' : ''}`}>
        <div className="mb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-bold transition-colors line-clamp-1 ${
              !room.isActive ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'
            }`}>
              {room.typeName}
            </h3>
            {room.isActive && room.isNonSmoking && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                <CigaretteOff size={10} /> Không hút thuốc
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">
            {room.description || 'Chưa có mô tả cho loại phòng này.'}
          </p>
        </div>

        {/* Tags cơ bản */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-50 my-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Users size={13} className="shrink-0" />
            <span className="truncate">{room.maxAdults}L {room.maxChildren ? `+ ${room.maxChildren}T` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Maximize2 size={13} className="shrink-0" />
            <span>{room.roomSize}m²</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <BedDouble size={13} className="shrink-0" />
            <span className="truncate">{room.bedType || 'Tiêu chuẩn'}</span>
          </div>
        </div>

        {/* Giá + Actions */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Giá mỗi đêm</span>
            <div className={`font-black text-lg leading-none ${
              !room.isActive ? 'text-gray-400' : 'text-blue-600'
            }`}>
              {Number(room.basePrice).toLocaleString('vi-VN')}₫
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onManageAmenities}
              className={`p-2 rounded-xl border transition-all ${
                !room.isActive 
                  ? 'text-gray-400 border-gray-100 bg-gray-50' 
                  : 'text-violet-600 border-violet-100 hover:bg-violet-50'
              }`}
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={onManageImages}
              className={`p-2 rounded-xl border transition-all ${
                !room.isActive 
                  ? 'text-gray-400 border-gray-100 bg-gray-50' 
                  : 'text-blue-600 border-blue-100 hover:bg-blue-50'
              }`}
            >
              <Upload size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Room Type Amenity Modal (NEW) ────────────────────────
function RoomTypeAmenityModal({
  room,
  qc,
  onClose,
}: {
  room: RoomTypeResponse
  qc: QueryClient
  onClose: () => void
}) {
  // Tất cả tiện ích hệ thống loại ROOM
  const { data: allAmenities = [] } = useAmenities()
  const roomAmenities = allAmenities.filter(a => a.type === 'ROOM')

  // Tiện ích đã gắn với loại phòng này
  const { data: linked = [], isLoading } = useQuery<RoomTypeAmenityResponse[]>({
    queryKey: ['room-type-amenities', room.id],
    queryFn: () => roomTypeAmenityApi.getByRoomType(room.id).then(r => r.data),
  })

  const linkedIds = new Set(linked.map(a => String(a.amenityId)))

  const selectedAmenities = roomAmenities.filter(a => linkedIds.has(String(a.id)))
  const availableAmenities = roomAmenities.filter(a => !linkedIds.has(String(a.id)))

  // Thêm tiện ích
  const addMutation = useMutation({
    mutationFn: (amenityId: number) =>
      roomTypeAmenityApi.create({ roomTypeId: room.id, amenityId, isFree: true }),
    onSuccess: () => {
      toast.success('Đã thêm tiện ích!')
      qc.invalidateQueries({ queryKey: ['room-type-amenities', room.id] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Thêm thất bại!')
    },
  })

  // Gỡ tiện ích
  const removeMutation = useMutation({
    mutationFn: (amenityId: number) =>
      roomTypeAmenityApi.delete(room.id, amenityId),
    onSuccess: () => {
      toast.success('Đã gỡ tiện ích!')
      qc.invalidateQueries({ queryKey: ['room-type-amenities', room.id] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Gỡ thất bại!')
    },
  })

  const isMutating = addMutation.isPending || removeMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Sparkles size={16} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Tiện ích loại phòng</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{room.typeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          ) : (
            <>
              {/* ── Tiện ích ĐANG CÓ ── */}
              <div className="rounded-2xl border-2 border-violet-400 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-b border-violet-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-violet-600" />
                    <span className="text-sm font-bold text-violet-900">Đang áp dụng</span>
                  </div>
                  <span className="text-xs font-black text-white bg-violet-600 px-2.5 py-0.5 rounded-full">
                    {selectedAmenities.length} tiện ích
                  </span>
                </div>

                <div className="p-4">
                  {selectedAmenities.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center gap-2 bg-gray-50">
                      <Sparkles className="text-gray-200" size={28} />
                      <p className="text-sm text-gray-400">Chưa có tiện ích nào cho loại phòng này</p>
                      <p className="text-xs text-gray-300">Thêm từ kho bên dưới</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedAmenities.map(a => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-3 bg-white border border-violet-100 rounded-xl shadow-sm hover:shadow-md transition-all group ring-1 ring-violet-50"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0 text-white">
                              {a.iconUrl
                                ? <img src={a.iconUrl} alt="" className="w-5 h-5 object-contain" />
                                : <Sparkles size={14} />
                              }
                            </div>
                            <span className="font-semibold text-gray-800 text-sm truncate">{a.amenityName}</span>
                          </div>

                          <button
                            onClick={() => {
                              if (confirm(`Gỡ "${a.amenityName}" khỏi loại phòng này?`)) {
                                removeMutation.mutate(a.id)
                              }
                            }}
                            disabled={isMutating}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold border border-red-100 shrink-0 ml-2"
                          >
                            {removeMutation.isPending
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Trash2 size={11} />
                            }
                            Gỡ
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Kho tiện ích ── */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Settings2 size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Kho tiện ích phòng — Nhấn để thêm
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {availableAmenities.length === 0 ? (
                    <div className="text-center py-5 text-gray-400 text-sm italic">
                      Đã thêm tất cả tiện ích phòng có sẵn ✓
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {availableAmenities.map(a => (
                        <button
                          key={a.id}
                          onClick={() => addMutation.mutate(a.id)}
                          disabled={isMutating}
                          className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-violet-400 hover:bg-violet-50/40 transition-all group relative active:scale-95 disabled:opacity-50"
                        >
                          <div className="w-9 h-9 rounded-xl bg-gray-50 group-hover:bg-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            {a.iconUrl ? (
                              <img src={a.iconUrl} alt="" className="w-5 h-5 object-contain grayscale group-hover:grayscale-0" />
                            ) : (
                              <Sparkles size={14} className="text-gray-300 group-hover:text-violet-500" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 group-hover:text-violet-700 uppercase text-center line-clamp-2 leading-tight">
                            {a.amenityName}
                          </span>
                          <div className="px-2 py-0.5 bg-gray-100 group-hover:bg-violet-600 group-hover:text-white rounded text-[9px] font-black text-gray-400 transition-colors uppercase">
                            {addMutation.isPending ? '...' : '+ Thêm'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">
            {selectedAmenities.length}/{roomAmenities.length} tiện ích đã chọn
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Đóng
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
              <input
                {...register('bedType')}
                type="text"
                className={inputClass}
                placeholder="VD: 2 giường đơn, 1 giường đôi lớn..."
              />
              {errors.bedType && <p className="text-xs text-red-500 mt-1">{errors.bedType.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Diện tích (m²)</label>
              <input {...register('roomSize')} step="any" min={0} className={inputClass} placeholder="VD: 25" />
            </div>
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              {...register('isNonSmoking')}
              type="checkbox"
              id="isNonSmoking"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="isNonSmoking" className="text-sm font-medium text-gray-700">
              Phòng không hút thuốc (Non-smoking)
            </label>
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

