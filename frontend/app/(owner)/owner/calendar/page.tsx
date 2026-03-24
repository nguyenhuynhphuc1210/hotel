'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft, ChevronRight, Save, Loader2,
  X, AlertCircle, CheckCircle,
} from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import roomApi from '@/lib/api/room.api'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { RoomTypeResponse } from '@/types/room.types'
import { RoomCalendarResponse } from '@/types/calendar.types'
import toast from 'react-hot-toast'
import { useOwnerHotel } from '../../owner-hotel-context'

type ApiError = { response?: { data?: { message?: string } } }

const MONTH_NAMES = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
]
const DAY_LABELS = ['T2','T3','T4','T5','T6','T7','CN']

const updateSchema = z.object({
  startDate:   z.string().min(1, 'Chọn ngày bắt đầu'),
  endDate:     z.string().min(1, 'Chọn ngày kết thúc'),
  price:       z.coerce.number().min(1000, 'Giá tối thiểu 1,000₫'),
  totalRooms:  z.coerce.number().min(1, 'Tối thiểu 1 phòng'),
  isAvailable: z.boolean(),
})

type UpdateForm = z.infer<typeof updateSchema>

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

// --- Component Chính (Wrapper) ---
export default function OwnerCalendarPage() {
  const { activeHotel, activeHotelId } = useOwnerHotel()

  if (!activeHotel || !activeHotelId) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Chưa có khách sạn
      </div>
    )
  }

  /**
   * Giải pháp FIX: Sử dụng key={activeHotelId}. 
   * Khi activeHotelId thay đổi, component CalendarContent sẽ được unmount và mount lại.
   * Toàn bộ state bên trong (selectedRoomId, selectedDates, ...) sẽ tự động reset 
   * mà không cần dùng useEffect gây lỗi cascading renders.
   */
  return (
    <CalendarContent 
      key={activeHotelId} 
      activeHotelId={activeHotelId} 
      hotelName={activeHotel.hotelName} 
    />
  )
}

// --- Component Nội dung (Chứa toàn bộ logic cũ) ---
function CalendarContent({ activeHotelId, hotelName }: { activeHotelId: number, hotelName: string }) {
  const qc = useQueryClient()

  // State sẽ tự reset khi key ở component cha thay đổi
  const [calYear, setCalYear]           = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]         = useState(new Date().getMonth())
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedDates, setSelectedDates]   = useState<string[]>([])
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  // Lấy Room types của khách sạn đang chọn
  const { data: allRooms = [] } = useQuery({
    queryKey: ['owner-rooms', activeHotelId],
    queryFn: () => roomApi.getAll().then(r =>
      r.data.filter((rm: RoomTypeResponse) => rm.hotelId === activeHotelId)
    ),
    enabled: !!activeHotelId,
  })

  const activeRoomId = selectedRoomId ?? allRooms[0]?.id ?? null

  const firstDay = new Date(calYear, calMonth, 1).toISOString().split('T')[0]
  const lastDay  = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0]

  const { data: calendarData = [] } = useQuery({
    queryKey: ['room-calendar', activeRoomId, calYear, calMonth],
    queryFn: () => axiosInstance
      .get<RoomCalendarResponse[]>(API_CONFIG.ENDPOINTS.ROOM_CALENDAR(activeRoomId!), {
        params: { startDate: firstDay, endDate: lastDay },
      })
      .then(r => r.data),
    enabled: !!activeRoomId,
  })

  const calMap = new Map<string, RoomCalendarResponse>()
  calendarData.forEach(c => calMap.set(c.date, c))

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDay    = (y: number, m: number) => {
    const d = new Date(y, m, 1).getDay()
    return d === 0 ? 6 : d - 1
  }

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    )
  }

  const handleOpenUpdate = () => {
    if (selectedDates.length === 0) {
      toast.error('Chọn ít nhất 1 ngày để cập nhật')
      return
    }
    setShowUpdateModal(true)
  }

  const renderCalendar = () => {
    const days      = getDaysInMonth(calYear, calMonth)
    const firstDay  = getFirstDay(calYear, calMonth)
    const today     = new Date().toISOString().split('T')[0]
    const cells     = []

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e${i}`} />)
    }

    for (let day = 1; day <= days; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const cal     = calMap.get(dateStr)
      const isPast  = dateStr < today
      const isSelected = selectedDates.includes(dateStr)
      const available  = cal ? cal.isAvailable && (cal.totalRooms - cal.bookedRooms) > 0 : null

      cells.push(
        <button
          key={day}
          disabled={isPast}
          type="button"
          onClick={() => !isPast && toggleDate(dateStr)}
          className={[
            'relative rounded-xl border text-left p-1.5 transition-all min-h-[72px] flex flex-col',
            isPast
              ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-50'
              : isSelected
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
              : available === true
              ? 'border-green-200 bg-white hover:border-green-400 cursor-pointer'
              : available === false
              ? 'border-red-200 bg-red-50 hover:border-red-300 cursor-pointer'
              : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer',
          ].join(' ')}
        >
          <div className={`text-xs font-bold mb-1 ${
            isPast ? 'text-gray-400'
            : isSelected ? 'text-blue-700'
            : 'text-gray-800'
          }`}>
            {day}
          </div>

          {cal ? (
            <>
              <div className="text-xs font-semibold text-gray-700 truncate">
                {Number(cal.price).toLocaleString('vi-VN')}₫
              </div>
              <div className="text-xs text-gray-500 mt-auto">
                {cal.totalRooms - cal.bookedRooms}/{cal.totalRooms} phòng
              </div>
              <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                cal.isAvailable && (cal.totalRooms - cal.bookedRooms) > 0
                  ? 'bg-green-400'
                  : 'bg-red-400'
              }`} />
            </>
          ) : (
            <div className="text-xs text-gray-300 mt-auto">Chưa có</div>
          )}
        </button>
      )
    }
    return cells
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch & Giá phòng</h1>
          <p className="text-sm text-gray-500 mt-1">{hotelName}</p>
        </div>
        {selectedDates.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-600 font-medium">
              Đã chọn {selectedDates.length} ngày
            </span>
            <button onClick={() => setSelectedDates([])}
              className="text-sm text-gray-400 hover:text-gray-600">
              Bỏ chọn
            </button>
            <button onClick={handleOpenUpdate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Save size={15} /> Cập nhật {selectedDates.length} ngày
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {allRooms.map((rm: RoomTypeResponse) => (
          <button key={rm.id}
            onClick={() => { setSelectedRoomId(rm.id); setSelectedDates([]) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              activeRoomId === rm.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {rm.typeName}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Còn phòng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Hết phòng / Tắt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Đang chọn
        </span>
        <span className="text-gray-400">· Click để chọn ngày, cập nhật giá và số phòng</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-bold text-gray-900">
            {MONTH_NAMES[calMonth]} {calYear}
          </h2>
          <button onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {renderCalendar()}
        </div>
      </div>

      {showUpdateModal && activeRoomId && (
        <UpdateModal
          roomId={activeRoomId}
          selectedDates={selectedDates}
          qc={qc}
          calYear={calYear}
          calMonth={calMonth}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedDates([])
          }}
        />
      )}
    </div>
  )
}

function UpdateModal({ roomId, selectedDates, qc, calYear, calMonth, onClose }: {
  roomId: number
  selectedDates: string[]
  qc: ReturnType<typeof useQueryClient>
  calYear: number
  calMonth: number
  onClose: () => void
}) {
  const sortedDates = [...selectedDates].sort()
  const startDate   = sortedDates[0]
  const endDate     = sortedDates[sortedDates.length - 1]

  const updateMutation = useMutation({
    mutationFn: (data: UpdateForm) =>
      axiosInstance.put(
        API_CONFIG.ENDPOINTS.ROOM_CALENDAR_UPDATE(roomId),
        data
      ),
    onSuccess: () => {
      toast.success('Cập nhật lịch thành công!')
      qc.invalidateQueries({ queryKey: ['room-calendar', roomId, calYear, calMonth] })
      onClose()
    },
    onError: (e: unknown) => {
      const err = e as ApiError
      toast.error(err?.response?.data?.message || 'Cập nhật thất bại!')
    },
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema) as Resolver<UpdateForm>,
    defaultValues: {
      startDate,
      endDate,
      price:       500000,
      totalRooms:  1,
      isAvailable: true,
    },
  })

  const isAvailable = watch('isAvailable')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Cập nhật lịch phòng</h2>
            <p className="text-xs text-gray-400 mt-0.5">{selectedDates.length} ngày được chọn</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Từ ngày</label>
              <input {...register('startDate')} type="date" className={inputClass} />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Đến ngày</label>
              <input {...register('endDate')} type="date" className={inputClass} />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label className={labelClass}>Giá / đêm (₫) <span className="text-red-500">*</span></label>
            <input {...register('price')} type="number" min={0} className={inputClass} placeholder="500000" />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Số phòng sẵn có <span className="text-red-500">*</span></label>
            <input {...register('totalRooms')} type="number" min={1} className={inputClass} />
            {errors.totalRooms && <p className="text-xs text-red-500 mt-1">{errors.totalRooms.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Trạng thái</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                isAvailable ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input id="av-true" {...register('isAvailable')} type="radio" value="true" className="accent-green-600" checked={isAvailable === true} onChange={() => {}} />
                <CheckCircle size={16} className={isAvailable ? 'text-green-600' : 'text-gray-300'} />
                <span className={`text-sm font-medium ${isAvailable ? 'text-green-700' : 'text-gray-500'}`}>Mở bán</span>
              </label>
              <label className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                !isAvailable ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input id="av-false" {...register('isAvailable')} type="radio" value="false" className="accent-red-500" checked={isAvailable === false} onChange={() => {}} />
                <AlertCircle size={16} className={!isAvailable ? 'text-red-500' : 'text-gray-300'} />
                <span className={`text-sm font-medium ${!isAvailable ? 'text-red-600' : 'text-gray-500'}`}>Tạm đóng</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">Huỷ</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}