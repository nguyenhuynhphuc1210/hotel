'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, X, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
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
import { exportBookings } from '@/lib/api/export.api'

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
  const [isExporting, setIsExporting] = useState(false)
  const pageSize = 10

  const queryClient = useQueryClient()
  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  const handleKeywordChange = (val: string) => { setKeyword(val); setCurrentPage(0) }
  const handleStatusChange = (val: BookingStatus | '') => { setStatusFilter(val); setCurrentPage(0) }

  const getNights = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const { data: bookingsPage, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['owner-bookings', activeHotelId, currentPage, keyword, statusFilter],
    queryFn: () => bookingApi.getAll(currentPage, pageSize, {
      keyword: keyword || undefined,
      status: statusFilter || undefined,
      hotelId: activeHotelId ?? undefined,
    }).then(r => r.data),
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

  const bookings = bookingsPage?.content || []

  const { data: statsPage } = useQuery({
    queryKey: ['owner-bookings-stats', activeHotelId],
    queryFn: () => bookingApi.getAll(0, 10000, {
      hotelId: activeHotelId ?? undefined,
    }).then(r => r.data),
    enabled: !!activeHotelId,
  })

  const statsBookings = statsPage?.content || []
  const stats = Object.fromEntries(
    BOOKING_STAT_STATUSES.map(s => [s, statsBookings.filter((b: BookingResponse) => b.status === s).length])
  ) as Record<BookingStatus, number>

  const isLoading = isBookingsLoading || isHotelLoading

  // ── Export handler: truyền hotelId của hotel owner đang chọn ──
  const handleExport = async () => {
    if (!activeHotelId) return
    setIsExporting(true)
    try {
      await exportBookings({
        keyword: keyword || undefined,
        status: statusFilter || undefined,
        hotelId: activeHotelId,
      })
      toast.success('Xuất file thành công!')
    } catch {
      toast.error('Xuất file thất bại, vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!activeHotel && !isHotelLoading) {
    return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đặt phòng</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeHotel?.hotelName} · Tổng {bookingsPage?.totalElements ?? 0} đơn
          </p>
        </div>

        {/* Nút Export Excel */}
        <button
          onClick={handleExport}
          disabled={isExporting || !activeHotelId}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shrink-0"
        >
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {BOOKING_STAT_STATUSES.map((s) => {
          const config = BOOKING_STATUS_CONFIG[s]
          const Icon = config.icon
          const active = statusFilter === s
          return (
            <button key={s} onClick={() => handleStatusChange(active ? '' : s)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm tên, email, mã booking..."
            value={keyword} onChange={(e) => handleKeywordChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <select value={statusFilter} onChange={e => handleStatusChange(e.target.value as BookingStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STAT_STATUSES.map(s => (
            <option key={s} value={s}>{BOOKING_STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {(keyword || statusFilter) && (
          <button onClick={() => { handleKeywordChange(''); handleStatusChange('') }}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Export note khi có filter */}
      {(keyword || statusFilter) && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          📌 File Excel sẽ được xuất theo bộ lọc đang áp dụng.
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Mã booking</th>
                <th className="text-left px-4 py-3">Khách</th>
                <th className="text-left px-4 py-3">Ngày đặt</th>
                <th className="text-left px-4 py-3">Ngày lưu trú</th>
                <th className="text-left px-4 py-3">Tổng tiền</th>
                <th className="text-left px-4 py-3">Thanh toán</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-medium">
                  Không có đơn đặt phòng nào
                </td></tr>
              ) : (
                bookings.map((b: BookingResponse) => {
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
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="font-bold text-gray-900">
                          {new Date(b.checkInDate).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="text-gray-400">→ {new Date(b.checkOutDate).toLocaleDateString('vi-VN')}</div>
                        {/* Thêm Badge số đêm */}
                        <span className="mt-1 inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">
                          {getNights(b.checkInDate, b.checkOutDate)} đêm
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{b.totalAmount.toLocaleString()}₫</td>
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
                        {nextStatuses ? (
                          <select disabled={isUpdating} value={b.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: b.id, status: e.target.value as BookingStatus })}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-blue-500 ${s.class}`}>
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
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDetailBooking(b)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
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

        {/* Pagination */}
        {bookingsPage && bookingsPage.totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, bookingsPage.totalElements)} / {bookingsPage.totalElements} đơn
            </p>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700">Trang {currentPage + 1} / {bookingsPage.totalPages}</span>
              <button disabled={currentPage >= bookingsPage.totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-white transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
          isUpdating={updateStatusMutation.isPending}
        />
      )}
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────
function BookingDetailModal({ booking: b, onClose, onUpdateStatus, isUpdating }: BookingDetailModalProps) {
  // Helper tính số đêm
  const getNights = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const nights = getNights(b.checkInDate, b.checkOutDate);

  // Xử lý ép kiểu an toàn cho Config để tránh lỗi ESLint 'any'
  const paymentStatusKey = (b.paymentStatus || 'PENDING') as keyof typeof PAYMENT_STATUS_CONFIG;
  const paymentConfig = PAYMENT_STATUS_CONFIG[paymentStatusKey];

  const paymentMethodKey = (b.paymentMethod || 'CASH') as keyof typeof PAYMENT_METHOD_LABELS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Chi tiết Booking #{b.bookingCode}</h2>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
              Đặt lúc: {new Date(b.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Thông báo hủy nếu có */}
          {b.status === 'CANCELLED' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-bold text-red-600 uppercase mb-1">Thông tin hủy phòng</p>
              <p className="text-sm text-red-700 font-medium">Lý do: {b.cancelReason || 'Không có lý do cụ thể'}</p>
              <div className="text-[10px] text-red-400 mt-2 flex justify-between">
                <span>Hủy bởi: {b.cancelledBy || 'Hệ thống'}</span>
                <span>Lúc: {b.cancelledAt ? new Date(b.cancelledAt).toLocaleString('vi-VN') : '---'}</span>
              </div>
            </div>
          )}

          {/* Stay Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nhận phòng</p>
              <p className="text-sm font-bold text-gray-800">{new Date(b.checkInDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Trả phòng</p>
              <p className="text-sm font-bold text-gray-800">{new Date(b.checkOutDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col justify-center items-center">
              <p className="text-lg font-black text-blue-600 leading-none">{nights}</p>
              <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">Số đêm</p>
            </div>
          </div>

          {/* Guest Info */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Khách lưu trú & Thanh toán</p>
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div>
                <p className="text-sm font-bold text-gray-800">{b.guestName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{b.guestPhone} · {b.guestEmail}</p>
              </div>
              <div className="text-right border-l pl-4 border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Phương thức TT</p>
                <p className="text-xs font-bold text-gray-700">
                  {PAYMENT_METHOD_LABELS[paymentMethodKey] || b.paymentMethod}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Chi tiết thanh toán</p>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              {/* Danh sách phòng */}
              <div className="space-y-2">
                {b.bookingRooms.map((room) => (
                  <div key={room.id} className="flex justify-between text-sm items-center">
                    <div className="flex flex-col">
                      <span className="text-gray-700 font-semibold">{room.roomTypeName}</span>
                      <span className="text-[11px] text-gray-400">Số lượng: {room.quantity} phòng</span>
                    </div>
                    <span className="font-bold text-gray-900">
                      {(room.pricePerNight * room.quantity * nights).toLocaleString()}₫
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tạm tính (Giá phòng)</span>
                  <span>{b.subtotal.toLocaleString()}₫</span>
                </div>
                
                {b.promoCode && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span className="flex items-center gap-1">Mã giảm giá ({b.promoCode})</span>
                    <span>-{b.discountAmount?.toLocaleString()}₫</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-gray-900">Tổng khách trả</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-blue-600">
                      {b.totalAmount.toLocaleString()}₫
                    </span>
                    <p className="text-[10px] text-gray-400 font-medium">Đã bao gồm phí và thuế</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer actions */}
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center gap-3">
           <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Trạng thái TT:</span>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${paymentConfig?.class}`}>
                {paymentConfig?.label || b.paymentStatus}
              </span>
           </div>
           
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 rounded-xl transition-all shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}