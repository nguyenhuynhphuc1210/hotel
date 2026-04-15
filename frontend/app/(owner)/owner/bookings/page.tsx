'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import bookingApi from '@/lib/api/booking.api'
import { BookingResponse, BookingStatus, BookingRoomResponse } from '@/types/booking.types'
import { useOwnerHotel } from '../../owner-hotel-context'
import toast from 'react-hot-toast'
import {
  BOOKING_STATUS_CONFIG,
  BOOKING_STATUS_TRANSITIONS,
  BOOKING_TRANSITION_LABELS,
  BOOKING_STAT_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_CONFIG,
} from '@/config/booking-status.config'

// Định nghĩa Interface cho Props của Modal để xóa bỏ lỗi 'any'
interface BookingDetailModalProps {
  booking: BookingResponse
  onClose: () => void
  onUpdateStatus: (id: number, status: BookingStatus) => void
  isUpdating: boolean
}

export default function OwnerBookingsPage() {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10
  
  const queryClient = useQueryClient()
  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  // 1. Fetch Bookings (Có phân trang)
  const { data: bookingsPage, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['owner-bookings', activeHotelId, currentPage],
    queryFn: () => bookingApi.getAll(currentPage, pageSize).then((r) => r.data),
    enabled: !!activeHotelId,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      bookingApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['owner-bookings', activeHotelId] })
      const label = BOOKING_STATUS_CONFIG[vars.status]?.label ?? vars.status
      toast.success(`Đã cập nhật: ${label}`)
      setDetailBooking(null)
    },
    onError: () => toast.error('Không thể cập nhật trạng thái'),
  })

  // Trích xuất mảng content từ đối tượng Page
  const allBookings = bookingsPage?.content || []
  
  // Lọc dữ liệu hiển thị (Keyword & Status)
  const filtered = allBookings.filter((b: BookingResponse) => {
    if (b.hotelId !== activeHotelId) return false

    const matchKeyword =
      !keyword ||
      b.guestName.toLowerCase().includes(keyword.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(keyword.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(keyword.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchKeyword && matchStatus
  })

  // Thống kê (Dựa trên dữ liệu trang hiện tại)
  const stats = Object.fromEntries(
    BOOKING_STAT_STATUSES.map((s) => [
      s,
      allBookings.filter((b: BookingResponse) => b.status === s && b.hotelId === activeHotelId).length,
    ])
  ) as Record<BookingStatus, number>

  const isLoading = isBookingsLoading || isHotelLoading

  if (!activeHotel && !isHotelLoading) {
    return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đặt phòng</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeHotel?.hotelName} · Trang {currentPage + 1} / {bookingsPage?.totalPages || 1}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {BOOKING_STAT_STATUSES.map((s) => {
          const config = BOOKING_STATUS_CONFIG[s]
          const Icon = config.icon
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? '' : s)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className={active ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-xs text-gray-500 leading-tight">{config.label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{stats[s] ?? 0}</div>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên, email, mã booking..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Mã booking</th>
                <th className="text-left px-4 py-3">Khách</th>
                <th className="text-left px-4 py-3">Ngày lưu trú</th>
                <th className="text-left px-4 py-3">Tổng tiền</th>
                <th className="text-left px-4 py-3">Thanh toán</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 font-medium">
                    Không có đơn đặt phòng nào
                  </td>
                </tr>
              ) : (
                filtered.map((b: BookingResponse) => {
                  const s = BOOKING_STATUS_CONFIG[b.status]
                  const nextStatuses = BOOKING_STATUS_TRANSITIONS[b.status]
                  const isUpdating = updateStatusMutation.isPending && updateStatusMutation.variables?.id === b.id

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{b.bookingCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{b.guestName}</div>
                        <div className="text-xs text-gray-400">{b.guestEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div>{new Date(b.checkInDate).toLocaleDateString('vi-VN')}</div>
                        <div className="text-gray-400">→ {new Date(b.checkOutDate).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {b.totalAmount.toLocaleString()}₫
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-gray-600">
                          {PAYMENT_METHOD_LABELS[b.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || b.paymentMethod}
                        </div>
                        {b.paymentStatus && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${PAYMENT_STATUS_CONFIG[b.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]?.class}`}>
                            {PAYMENT_STATUS_CONFIG[b.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]?.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {nextStatuses ? (
                            <select
                              disabled={isUpdating}
                              value={b.status}
                              onChange={(e) => updateStatusMutation.mutate({ id: b.id, status: e.target.value as BookingStatus })}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-blue-500 ${s.class}`}
                            >
                              <option value={b.status}>{s.label}</option>
                              {nextStatuses.map(ns => (
                                <option key={ns} value={ns}>{BOOKING_TRANSITION_LABELS[ns] || ns}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${s.class}`}>
                              {s.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDetailBooking(b)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {bookingsPage && bookingsPage.totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Hiển thị đơn thứ {currentPage * pageSize + 1} đến {Math.min((currentPage + 1) * pageSize, bookingsPage.totalElements)} trong tổng số {bookingsPage.totalElements} đơn
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700">Trang {currentPage + 1}</span>
              <button
                disabled={currentPage >= bookingsPage.totalPages - 1}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal chi tiết */}
      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onUpdateStatus={(id: number, status: BookingStatus) => updateStatusMutation.mutate({ id, status })}
          isUpdating={updateStatusMutation.isPending}
        />
      )}
    </div>
  )
}

// ─── Detail Modal Component ──────────────────────────────────
function BookingDetailModal({ 
  booking: b, 
  onClose, 
  onUpdateStatus, 
  isUpdating 
}: BookingDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-900">Chi tiết Booking #{b.bookingCode}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20}/>
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-[10px] text-blue-500 font-bold uppercase">Ngày nhận phòng</p>
                    <p className="font-semibold text-gray-800">{new Date(b.checkInDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">Ngày trả phòng</p>
                    <p className="font-semibold text-gray-800">{new Date(b.checkOutDate).toLocaleDateString('vi-VN')}</p>
                </div>
             </div>
             
             <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Thông tin khách</p>
                <div className="border rounded-xl p-3 space-y-1">
                    <p className="text-sm font-bold text-gray-800">{b.guestName}</p>
                    <p className="text-xs text-gray-500">{b.guestEmail} · {b.guestPhone}</p>
                </div>
             </div>

             <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase">Chi tiết phòng</p>
                <div className="space-y-2">
                  {b.bookingRooms.map((room: BookingRoomResponse) => (
                      <div key={room.id} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-200">
                          <span className="text-gray-700">{room.roomTypeName} <span className="text-gray-400 font-normal">x {room.quantity}</span></span>
                          <span className="font-bold text-gray-900">{room.pricePerNight.toLocaleString()}₫</span>
                      </div>
                  ))}
                </div>
             </div>

             <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                <span className="font-bold text-gray-700">Tổng cộng:</span>
                <span className="text-xl font-black text-blue-600">{b.totalAmount.toLocaleString()}₫</span>
             </div>
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Đóng
            </button>
            
            {/* Nếu cần cập nhật trạng thái trong Modal, bạn có thể map qua BOOKING_STATUS_TRANSITIONS ở đây */}
        </div>
      </div>
    </div>
  )
}