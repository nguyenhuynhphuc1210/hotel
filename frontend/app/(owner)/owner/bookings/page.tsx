'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, CheckCircle, XCircle, Clock, Eye, X } from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import bookingApi from '@/lib/api/booking.api'
import { BookingResponse, BookingStatus } from '@/types/booking.types'
import { useOwnerHotel } from '../../owner-hotel-context'

const STATUS_MAP: Record<BookingStatus, { label: string; class: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Chờ xác nhận', class: 'bg-amber-50 text-amber-700',  icon: Clock        },
  CONFIRMED: { label: 'Đã xác nhận',  class: 'bg-green-50 text-green-700',  icon: CheckCircle  },
  COMPLETED: { label: 'Hoàn thành',   class: 'bg-blue-50 text-blue-700',    icon: CheckCircle  },
  CANCELLED: { label: 'Đã huỷ',       class: 'bg-red-50 text-red-700',      icon: XCircle      },
}

export default function OwnerBookingsPage() {
  const [keyword, setKeyword]         = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)

  // 1. Lấy dữ liệu từ Context
  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  // 2. Lấy đơn hàng dựa trên activeHotelId
  const { data: allBookings = [], isLoading: isBookingsLoading } = useQuery({
    queryKey: ['owner-bookings', activeHotelId],
    queryFn: () => bookingApi.getAll().then(r =>
      r.data.filter((b: BookingResponse) => b.hotelId === activeHotelId)
    ),
    enabled: !!activeHotelId,
  })

  const hotel = activeHotel
  const isLoading = isBookingsLoading || isHotelLoading

  const filtered = allBookings.filter((b: BookingResponse) => {
    const matchKeyword = !keyword ||
      b.guestName.toLowerCase().includes(keyword.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(keyword.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(keyword.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchKeyword && matchStatus
  })

  const stats = {
    PENDING:   allBookings.filter((b: BookingResponse) => b.status === 'PENDING').length,
    CONFIRMED: allBookings.filter((b: BookingResponse) => b.status === 'CONFIRMED').length,
    COMPLETED: allBookings.filter((b: BookingResponse) => b.status === 'COMPLETED').length,
    CANCELLED: allBookings.filter((b: BookingResponse) => b.status === 'CANCELLED').length,
  }

  if (!hotel && !isHotelLoading) return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đặt phòng</h1>
        <p className="text-sm text-gray-500 mt-1">
          {hotel?.hotelName} · Tổng {allBookings.length} đơn
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(Object.keys(STATUS_MAP) as BookingStatus[]).map(s => {
          const { label, class: cls, icon: Icon } = STATUS_MAP[s]
          return (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                statusFilter === s ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={statusFilter === s ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{stats[s]}</div>
            </button>
          )
        })}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Tìm tên, email, mã booking..."
          value={keyword} onChange={e => setKeyword(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Mã booking</th>
              <th className="text-left px-4 py-3">Khách</th>
              <th className="text-left px-4 py-3">Ngày lưu trú</th>
              <th className="text-left px-4 py-3">Tổng tiền</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Không có đơn nào</td></tr>
            )}
            {filtered.map((b: BookingResponse) => {
              const s = STATUS_MAP[b.status]
              const Icon = s.icon
              return (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.bookingCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.guestName}</div>
                    <div className="text-xs text-gray-400">{b.guestEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{new Date(b.checkInDate).toLocaleDateString('vi-VN')}</div>
                    <div className="text-xs text-gray-400">→ {new Date(b.checkOutDate).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>
                      <Icon size={11} /> {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetailBooking(b)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detailBooking && (
        <BookingDetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} />
      )}
    </div>
  )
}

function BookingDetailModal({ booking: b, onClose }: { booking: BookingResponse; onClose: () => void }) {
  const s = STATUS_MAP[b.status]
  const Icon = s.icon
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Chi tiết đặt phòng</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{b.bookingCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Trạng thái</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>
              <Icon size={11} /> {s.label}
            </span>
          </div>
          {[
            { label: 'Khách', value: b.guestName },
            { label: 'Email', value: b.guestEmail },
            { label: 'SĐT', value: b.guestPhone },
            { label: 'Nhận phòng', value: new Date(b.checkInDate).toLocaleDateString('vi-VN') },
            { label: 'Trả phòng', value: new Date(b.checkOutDate).toLocaleDateString('vi-VN') },
            { label: 'Tạm tính', value: `${Number(b.subtotal).toLocaleString('vi-VN')}₫` },
            { label: 'Giảm giá', value: b.discountAmount ? `${Number(b.discountAmount).toLocaleString('vi-VN')}₫` : '—' },
            { label: 'Tổng tiền', value: `${Number(b.totalAmount).toLocaleString('vi-VN')}₫` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}
          {b.bookingRooms?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Phòng đã đặt</p>
              {b.bookingRooms.map(r => (
                <div key={r.id} className="flex justify-between text-sm text-gray-600 py-1">
                  <span>{r.roomTypeName} × {r.quantity}</span>
                  <span>{Number(r.pricePerNight).toLocaleString('vi-VN')}₫/đêm</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}