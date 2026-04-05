'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Save, Loader2, Upload, Trash2, Star, Hotel,
  Shield, Sparkles, Link as LinkIcon, Plus, CheckCircle2, X
} from 'lucide-react'
import hotelApi, { HotelResponse, HotelImageResponse } from '@/lib/api/hotel.api'
import policyApi from '@/lib/api/policy.api'
import hotelImageApi from '@/lib/api/hotel-image.api'
import { hotelAmenityApi } from '@/lib/api/amenity.api'
import { useAmenities } from '@/hooks/useAmenity'
import { HotelPolicyResponse } from '@/types/policy.types'
import { HotelAmenityResponse } from '@/types/amenity.types'
import toast from 'react-hot-toast'
import { useOwnerHotel } from '../../owner-hotel-context'


// ── Schemas ──────────────────────────────────────────────
const hotelSchema = z.object({
  hotelName: z.string().min(1, 'Không được để trống'),
  description: z.string().optional(),
  addressLine: z.string().min(1, 'Không được để trống'),
  ward: z.string().min(1, 'Không được để trống'),
  district: z.string().min(1, 'Không được để trống'),
  city: z.string().min(1, 'Không được để trống'),
  phone: z.string().regex(/^\d{10,11}$/, 'Số điện thoại 10-11 chữ số'),
  email: z.string().email('Email không đúng định dạng'),
})

const policySchema = z.object({
  checkInTime: z.string().min(1, 'Không được để trống'),
  checkOutTime: z.string().min(1, 'Không được để trống'),
  cancellationPolicy: z.string().min(1, 'Không được để trống'),
  childrenPolicy: z.string().min(1, 'Không được để trống'),
  petPolicy: z.string().min(1, 'Không được để trống'),
})

type HotelForm = z.infer<typeof hotelSchema>
type PolicyForm = z.infer<typeof policySchema>

type ApiError = { response?: { data?: { message?: string } } }

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const textareaClass = `${inputClass} resize-none`

type Tab = 'info' | 'policy' | 'amenity'

// ── Page ─────────────────────────────────────────────────
export default function OwnerHotelPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('info')

  const { activeHotel, isLoading } = useOwnerHotel()

  if (isLoading) return <div className="py-20 text-center text-gray-400">Đang tải...</div>
  if (!activeHotel) return <div className="py-20 text-center text-gray-400">Chưa có khách sạn</div>

  const hotel = activeHotel

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Thông tin', icon: Hotel },
    { key: 'policy', label: 'Chính sách', icon: Shield },
    { key: 'amenity', label: 'Tiện ích', icon: Sparkles },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý khách sạn</h1>
        <p className="text-sm text-gray-500 mt-1">{hotel.hotelName}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'info' && <InfoTab key={activeHotel.id} hotel={activeHotel} qc={qc} />}
      {tab === 'policy' && <PolicyTab key={activeHotel.id} hotel={activeHotel} qc={qc} />}
      {tab === 'amenity' && <AmenityTab key={activeHotel.id} hotel={activeHotel} qc={qc} />}
    </div>
  )
}

// ─── Tab Thông tin ────────────────────────────────────────
function InfoTab({ hotel, qc }: { hotel: HotelResponse; qc: QueryClient }) {
  const updateMutation = useMutation({
    mutationFn: (data: HotelForm) =>
      hotelApi.update(hotel.id, { ...data, ownerId: hotel.ownerId }),
    onSuccess: () => {
      toast.success('Cập nhật thành công!')
      qc.invalidateQueries({ queryKey: ['owner-hotels'] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Lỗi cập nhật')
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<HotelForm>({
    resolver: zodResolver(hotelSchema) as Resolver<HotelForm>,
    defaultValues: {
      hotelName: hotel.hotelName,
      description: hotel.description ?? '',
      addressLine: hotel.addressLine,
      ward: hotel.ward,
      district: hotel.district,
      city: hotel.city,
      phone: hotel.phone,
      email: hotel.email,
    },
  })

  return (
    <div className="space-y-5">
      <ImageSection hotel={hotel} qc={qc} />

      <form
        onSubmit={handleSubmit(d => updateMutation.mutate(d))}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-900">Thông tin cơ bản</h2>

        <div>
          <label className={labelClass}>Tên khách sạn <span className="text-red-500">*</span></label>
          <input {...register('hotelName')} className={inputClass} />
          {errors.hotelName && <p className="text-xs text-red-500 mt-1">{errors.hotelName.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Mô tả</label>
          <textarea {...register('description')} rows={4} className={textareaClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email <span className="text-red-500">*</span></label>
            <input {...register('email')} className={inputClass} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Số điện thoại <span className="text-red-500">*</span></label>
            <input {...register('phone')} className={inputClass} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>Địa chỉ <span className="text-red-500">*</span></label>
          <input {...register('addressLine')} className={inputClass} />
          {errors.addressLine && <p className="text-xs text-red-500 mt-1">{errors.addressLine.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Phường/Xã <span className="text-red-500">*</span></label>
            <input {...register('ward')} className={inputClass} />
            {errors.ward && <p className="text-xs text-red-500 mt-1">{errors.ward.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Quận/Huyện <span className="text-red-500">*</span></label>
            <input {...register('district')} className={inputClass} />
            {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Thành phố <span className="text-red-500">*</span></label>
            <input {...register('city')} className={inputClass} />
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {updateMutation.isPending
              ? <Loader2 size={15} className="animate-spin" />
              : <Save size={15} />}
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Image Section (Đã cập nhật tính năng thêm bằng URL) ────────────────
function ImageSection({ hotel, qc }: { hotel: HotelResponse; qc: QueryClient }) {
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')



  // Mutation: Upload file
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => hotelImageApi.upload(hotel.id, files),
    onSuccess: () => {
      toast.success('Upload ảnh thành công!')
      qc.invalidateQueries({ queryKey: ['owner-hotels'] })
    },
    onError: () => toast.error('Upload thất bại!')
  })

  // Mutation: Thêm bằng URL
  const addUrlMutation = useMutation({
    mutationFn: (url: string) => hotelImageApi.uploadByUrl(hotel.id, url), // Đảm bảo api.ts có hàm uploadByUrl
    onSuccess: () => {
      toast.success('Đã thêm ảnh từ URL!')
      setUrlInput('')
      qc.invalidateQueries({ queryKey: ['owner-hotels'] })
    },
    onError: () => toast.error('Không thể thêm ảnh từ URL này!')
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    uploadMutation.mutate(files)
  }

  const handleAddByUrl = () => {
    if (!urlInput.trim()) return
    if (!urlInput.startsWith('http')) {
      toast.error('URL không hợp lệ')
      return
    }
    addUrlMutation.mutate(urlInput)
  }

  const handleDelete = async (publicId: string) => {
    if (!confirm('Xoá ảnh này?')) return
    try {
      await hotelImageApi.delete(publicId)
      toast.success('Đã xoá ảnh!')
      qc.invalidateQueries({ queryKey: ['owner-hotels'] })
    } catch {
      toast.error('Xoá thất bại!')
    }
  }

  const handleSetPrimary = async (id: number) => {
    try {
      await hotelImageApi.setPrimary(id)
      toast.success('Đã đặt làm ảnh đại diện!')
      qc.invalidateQueries({ queryKey: ['owner-hotels'] })
    } catch {
      toast.error('Thất bại!')
    }
  }

  const isProcessing = uploadMutation.isPending || addUrlMutation.isPending

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Ảnh khách sạn</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Nhập URL */}
          <div className="relative flex items-center min-w-[280px]">
            <div className="absolute left-3 text-gray-400">
              <LinkIcon size={14} />
            </div>
            <input
              type="text"
              placeholder="Dán URL ảnh vào đây..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="pl-9 pr-20 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddByUrl}
              disabled={isProcessing || !urlInput.trim()}
              className="absolute right-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {addUrlMutation.isPending ? '...' : 'Thêm'}
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

          {/* Upload File */}
          <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}>
            {uploadMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Upload size={14} />}
            Upload file
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {!hotel.images?.length ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-gray-400 text-sm">
          Chưa có ảnh nào. Upload ảnh hoặc dán URL để hiển thị trên trang khách sạn.
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {hotel.images.map((img: HotelImageResponse) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200">
              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              {img.isPrimary && (
                <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={9} fill="white" /> Chính
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(img.id)}
                    className="p-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    title="Đặt làm ảnh chính"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(String(img.publicId))}
                  className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="Xoá ảnh"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab Chính sách ───────────────────────────────────────
function PolicyTab({ hotel, qc }: { hotel: HotelResponse; qc: QueryClient }) {
  const { data: policies = [] } = useQuery({
    queryKey: ['hotel-policies', hotel.id],
    queryFn: () => policyApi.getAll().then(r =>
      r.data.filter((p: HotelPolicyResponse) => p.hotelId === hotel.id)
    ),
  })

  const policy = policies[0] as HotelPolicyResponse | undefined

  const saveMutation = useMutation({
    mutationFn: (data: PolicyForm) => {
      const req = { ...data, hotelId: hotel.id }
      return policy
        ? policyApi.update(policy.id, req)
        : policyApi.create(req)
    },
    onSuccess: () => {
      toast.success('Lưu chính sách thành công!')
      qc.invalidateQueries({ queryKey: ['hotel-policies', hotel.id] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Lỗi lưu chính sách')
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<PolicyForm>({
    resolver: zodResolver(policySchema) as Resolver<PolicyForm>,
    defaultValues: {
      checkInTime: policy?.checkInTime ?? '14:00',
      checkOutTime: policy?.checkOutTime ?? '12:00',
      cancellationPolicy: policy?.cancellationPolicy ?? '',
      childrenPolicy: policy?.childrenPolicy ?? '',
      petPolicy: policy?.petPolicy ?? '',
    },
  })

  return (
    <form
      onSubmit={handleSubmit(d => saveMutation.mutate(d))}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
    >
      <h2 className="text-sm font-semibold text-gray-900">Chính sách khách sạn</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Giờ nhận phòng <span className="text-red-500">*</span></label>
          <input {...register('checkInTime')} type="time" className={inputClass} />
          {errors.checkInTime && <p className="text-xs text-red-500 mt-1">{errors.checkInTime.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Giờ trả phòng <span className="text-red-500">*</span></label>
          <input {...register('checkOutTime')} type="time" className={inputClass} />
          {errors.checkOutTime && <p className="text-xs text-red-500 mt-1">{errors.checkOutTime.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Chính sách huỷ đặt phòng <span className="text-red-500">*</span></label>
        <textarea {...register('cancellationPolicy')} rows={3} className={textareaClass}
          placeholder="VD: Miễn phí huỷ trước 24h. Huỷ trong 24h tính phí 1 đêm..." />
        {errors.cancellationPolicy && <p className="text-xs text-red-500 mt-1">{errors.cancellationPolicy.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Chính sách trẻ em <span className="text-red-500">*</span></label>
        <textarea {...register('childrenPolicy')} rows={3} className={textareaClass}
          placeholder="VD: Trẻ em dưới 6 tuổi được ở miễn phí khi dùng chung giường với bố mẹ..." />
        {errors.childrenPolicy && <p className="text-xs text-red-500 mt-1">{errors.childrenPolicy.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Chính sách thú cưng <span className="text-red-500">*</span></label>
        <textarea {...register('petPolicy')} rows={3} className={textareaClass}
          placeholder="VD: Không cho phép mang thú cưng vào khách sạn..." />
        {errors.petPolicy && <p className="text-xs text-red-500 mt-1">{errors.petPolicy.message}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saveMutation.isPending
            ? <Loader2 size={15} className="animate-spin" />
            : <Save size={15} />}
          Lưu chính sách
        </button>
      </div>
    </form>
  )
}

// ─── Tab Tiện ích ─────────────────────────────────────────

interface ExtendedHotelAmenity extends HotelAmenityResponse {
  amenity_id?: number; // Cho phép nhận diện cả amenity_id nếu backend trả về thô
}

export function AmenityTab({ hotel, qc }: { hotel: HotelResponse; qc: QueryClient }) {
  const { data: allAmenities = [] } = useAmenities()

  // Lấy danh sách tiện ích mà khách sạn này đã chọn (từ bảng trung gian)
  const { data: hotelAmenities = [], isLoading } = useQuery<HotelAmenityResponse[]>({
    queryKey: ['hotel-amenities-owner', hotel.id],
    queryFn: () => hotelAmenityApi.getByHotel(hotel.id).then(r => r.data),
  })

  // Mutation Thêm tiện ích vào khách sạn
  const addMutation = useMutation({
    mutationFn: (amenityId: number) =>
      hotelAmenityApi.create({ hotelId: hotel.id, amenityId, isFree: true }),
    onSuccess: () => {
      toast.success('Đã thêm tiện ích!')
      qc.invalidateQueries({ queryKey: ['hotel-amenities-owner', hotel.id] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Thêm thất bại')
    },
  })

  // Mutation Gỡ bỏ tiện ích khỏi khách sạn
  const deleteMutation = useMutation({
    mutationFn: (amenityId: number) =>
      hotelAmenityApi.delete(hotel.id, amenityId),
    onSuccess: () => {
      toast.success('Đã gỡ bỏ tiện ích thành công!')
      qc.invalidateQueries({ queryKey: ['hotel-amenities-owner', hotel.id] })
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Gỡ thất bại')
    },
  })

  // CHÍNH SỬA LOGIC: Lấy danh sách ID đã chọn 
  // Sử dụng ép kiểu (cast) sang ExtendedHotelAmenity để tránh lỗi 'any' mà vẫn đọc được amenity_id
  const linkedIds = new Set(
    (hotelAmenities as ExtendedHotelAmenity[]).map((a) =>
      String(a.amenityId || a.amenity_id)
    )
  );

  // Lọc ra các tiện ích ĐANG CÓ (nằm trong bảng trung gian)
  const selectedAmenities = allAmenities.filter(a => linkedIds.has(String(a.id)))

  // Lọc ra các tiện ích CHƯA CÓ (để hiển thị ở kho thêm mới)
  const availableAmenities = allAmenities.filter(a => !linkedIds.has(String(a.id)))

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-500" size={30} />
        <p className="text-gray-400">Đang đồng bộ tiện ích...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── PHẦN 1: TIỆN ÍCH ĐANG CÓ (Danh sách xanh) ── */}
      <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-blue-600" />
            <h3 className="text-base font-bold text-blue-900">Tiện ích ĐANG CÓ</h3>
          </div>
          <span className="text-xs font-black text-white bg-blue-600 px-3 py-1 rounded-full uppercase">
            {selectedAmenities.length} Dịch vụ
          </span>
        </div>

        <div className="p-6">
          {selectedAmenities.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-3 bg-gray-50">
              <Sparkles className="text-gray-300" size={40} />
              <p className="text-gray-500 font-medium">Bạn chưa chọn tiện ích nào.</p>
              <p className="text-xs text-gray-400">Hãy nhấp vào dấu cộng (+) ở bên dưới để thêm tiện ích cho khách sạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedAmenities.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-white border border-blue-200 rounded-2xl shadow-sm group ring-1 ring-blue-50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm">
                      {a.iconUrl ? <img src={a.iconUrl} alt="" className="w-6 h-6 object-contain" /> : <Sparkles size={16} />}
                    </div>
                    <span className="font-bold text-gray-800 truncate text-sm">{a.amenityName}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Gỡ bỏ "${a.amenityName}" khỏi danh sách dịch vụ khách sạn?`)) {
                        deleteMutation.mutate(a.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all font-bold border border-red-100 shadow-sm"
                  >
                    {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />}
                    <span className="text-[10px] uppercase">Gỡ bỏ</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PHẦN 2: KHO TIỆN ÍCH ĐỂ THÊM (Danh sách xám) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Kho tiện ích hệ thống (Thêm mới)</h3>
        </div>

        <div className="p-6">
          {availableAmenities.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm italic">
              Đã thêm tất cả các tiện ích có sẵn vào hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {availableAmenities.map(a => (
                <button
                  key={a.id}
                  onClick={() => addMutation.mutate(a.id)}
                  disabled={addMutation.isPending}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all group relative active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-transform">
                    {a.iconUrl ? (
                      <img src={a.iconUrl} alt="" className="w-5 h-5 object-contain grayscale group-hover:grayscale-0" />
                    ) : (
                      <Sparkles size={14} className="text-gray-300 group-hover:text-blue-500" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-700 uppercase text-center line-clamp-1">{a.amenityName}</span>
                  <div className="mt-1 px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {addMutation.isPending ? '...' : '+ THÊM'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}