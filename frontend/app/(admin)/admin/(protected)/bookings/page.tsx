'use client'

import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Search, Eye, X, Loader2, Download } from 'lucide-react'
import bookingApi from '@/lib/api/booking.api'
import { BookingResponse, BookingStatus } from '@/types/booking.types'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'
import { HotelResponse } from '@/lib/api/hotel.api'
import API_CONFIG from '@/config/api.config'
import Pagination from '@/components/ui/Pagination'
import { useAdminBookings } from '@/hooks/useBooking'
import {
  BOOKING_STATUS_CONFIG,
  BOOKING_STATUS_TRANSITIONS,
  BOOKING_TRANSITION_LABELS,
  BOOKING_STAT_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_CONFIG,
} from '@/config/booking-status.config'
import { exportBookings } from '@/lib/api/export.api'

export default function AdminBookingsPage() {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [hotelFilter, setHotelFilter] = useState<number | ''>('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [debouncedKeyword] = useDebounce(keyword, 400)
  const queryClient = useQueryClient()

  const selectedOwnerId = ownerFilter ? Number(ownerFilter) : undefined

  const { data: pageData, isLoading: isBookingsLoading } = useAdminBookings(
    currentPage,
    pageSize,
    {
      keyword: debouncedKeyword || undefined,
      status: statusFilter || undefined,
      hotelId: hotelFilter || undefined,
      ownerId: selectedOwnerId,
    }
  )

  const bookings = pageData?.content || []

  const { data: statsPage } = useAdminBookings(0, 10000, {})
  const statsBookings = statsPage?.content || []
  const stats = BOOKING_STAT_STATUSES.reduce((acc, s) => {
    acc[s] = statsBookings.filter((b: BookingResponse) => b.status === s).length
    return acc
  }, {} as Record<BookingStatus, number>)

  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, {
      params: { page: 0, size: 100 }
    }).then(r => r.data.content),
  })

  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const owners = Array.from(
    new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values()
  )

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      bookingApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      const label = BOOKING_STATUS_CONFIG[vars.status]?.label ?? vars.status
      toast.success(`Đã cập nhật: ${label}`)
      setDetailBooking(prev => prev?.id === vars.id ? null : prev)
    },
    onError: () => toast.error('Không thể cập nhật trạng thái'),
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportBookings({
        keyword: debouncedKeyword || undefined,
        status: statusFilter || undefined,
        hotelId: hotelFilter || undefined,
        ownerId: selectedOwnerId,
      })
      toast.success('Xuất file thành công!')
    } catch {
      toast.error('Xuất file thất bại, vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleKeywordChange = (val: string) => { setKeyword(val); setCurrentPage(0) }
  const handleStatusChange = (val: BookingStatus | '') => { setStatusFilter(val); setCurrentPage(0) }
  const handleHotelChange = (val: number | '') => { setHotelFilter(val); setCurrentPage(0) }
  const handleOwnerChange = (val: string) => { setOwnerFilter(val); setHotelFilter(''); setCurrentPage(0) }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đặt phòng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hệ thống Admin · Tổng {pageData?.totalElements || 0} đơn đặt phòng
          </p>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shrink-0"
        >
          {isExporting
            ? <Loader2 size={15} className="animate-spin" />
            : <Download size={15} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {BOOKING_STAT_STATUSES.map((s) => {
          const { label, icon: Icon } = BOOKING_STATUS_CONFIG[s]
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => handleStatusChange(active ? '' : s)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className={active ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-xs text-gray-500 leading-tight">{label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{stats[s] ?? 0}</div>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã booking, tên, email, khách sạn..."
            value={keyword}
            onChange={e => handleKeywordChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={ownerFilter}
          onChange={e => handleOwnerChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả chủ KS</option>
          {owners.map(o => (
            <option key={o.id} value={String(o.id)}>{o.name}</option>
          ))}
        </select>

        <select
          value={hotelFilter}
          onChange={e => handleHotelChange(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả khách sạn</option>
          {(ownerFilter ? hotels.filter(h => String(h.ownerId) === ownerFilter) : hotels).map(h => (
            <option key={h.id} value={h.id}>{h.hotelName}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value as BookingStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STAT_STATUSES.map(s => (
            <option key={s} value={s}>{BOOKING_STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {(keyword || statusFilter || hotelFilter || ownerFilter) && (
          <button
            onClick={() => { handleKeywordChange(''); handleStatusChange(''); handleHotelChange(''); handleOwnerChange('') }}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* Export note */}
      {(statusFilter || hotelFilter || ownerFilter || debouncedKeyword) && (
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
                <th className="text-left px-4 py-3">Khách sạn</th>
                <th className="text-left px-4 py-3">Ngày đặt</th>
                <th className="text-left px-4 py-3">Ngày lưu trú</th>
                <th className="text-left px-4 py-3">Tổng tiền</th>
                <th className="text-left px-4 py-3">Thanh toán</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {isBookingsLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 size={20} className="animate-spin text-gray-300 mx-auto" />
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">Không tìm thấy đơn nào</td>
                </tr>
              ) : (
                bookings.map((b: BookingResponse) => {
                  const s = BOOKING_STATUS_CONFIG[b.status]
                  const Icon = s.icon
                  const nextStatuses = BOOKING_STATUS_TRANSITIONS[b.status]
                  const isUpdatingThis = updateStatusMutation.isPending && updateStatusMutation.variables?.id === b.id
                  const ownerName = hotels.find(h => h.id === b.hotelId)?.ownerName ?? '—'
                  const paymentInfo = b.paymentMethod ? (PAYMENT_METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod) : null
                  const paymentStatus = b.paymentStatus ? PAYMENT_STATUS_CONFIG[b.paymentStatus] : null
                  const nights = calculateNights(b.checkInDate, b.checkOutDate);

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-blue-600 font-bold">{b.bookingCode}</div>
                        {/* Thêm Ngày đặt đơn */}
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date(b.createdAt).toLocaleDateString('vi-VN')} {new Date(b.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-900 text-sm">{b.guestName}</div>
                        <div className="text-gray-400">{b.guestEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-800 line-clamp-1">{b.hotelName}</div>
                        <div className="text-gray-400">Chủ: {ownerName}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div className="font-medium">{new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}</div>
                        <div className="text-gray-400">→ {new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</div>
                        {/* Thêm Badge số đêm */}
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">
                          {nights} đêm
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                        </div>
                        {Number(b.discountAmount) > 0 && (
                          <div className="text-[10px] text-red-500 font-medium">
                            Giảm: -{Number(b.discountAmount).toLocaleString('vi-VN')}₫
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">{paymentInfo ?? '—'}</div>
                        {paymentStatus && (
                          <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${paymentStatus.class}`}>
                            {paymentStatus.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {nextStatuses ? (
                            <select
                              disabled={isUpdatingThis}
                              value={b.status}
                              onChange={e => updateStatusMutation.mutate({ id: b.id, status: e.target.value as BookingStatus })}
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${s.class}`}
                            >
                              <option value={b.status}>{s.label}</option>
                              {nextStatuses.map(ns => (
                                <option key={ns} value={ns}>
                                  {BOOKING_TRANSITION_LABELS[ns] ?? BOOKING_STATUS_CONFIG[ns].label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>
                              <Icon size={11} /> {s.label}
                            </span>
                          )}
                          {isUpdatingThis && <Loader2 size={12} className="animate-spin text-gray-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailBooking(b)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {pageData && pageData.totalPages > 0 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={pageData.totalPages}
              totalElements={pageData.totalElements}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
          isUpdating={updateStatusMutation.isPending && updateStatusMutation.variables?.id === detailBooking.id}
        />
      )}
    </div>
  )
}

function BookingDetailModal({ booking: b, onClose, onUpdateStatus, isUpdating }: {
  booking: BookingResponse
  onClose: () => void
  onUpdateStatus: (id: number, status: BookingStatus) => void
  isUpdating: boolean
}) {
  const s = BOOKING_STATUS_CONFIG[b.status]
  const Icon = s.icon
  const nextStatuses = BOOKING_STATUS_TRANSITIONS[b.status]

  // Tránh dùng any bằng cách ép kiểu key an toàn
  const pStatusKey = (b.paymentStatus || 'PENDING') as keyof typeof PAYMENT_STATUS_CONFIG;
  const paymentStatus = PAYMENT_STATUS_CONFIG[pStatusKey];

  const pMethodKey = (b.paymentMethod || 'CASH') as keyof typeof PAYMENT_METHOD_LABELS;
  const paymentMethod = PAYMENT_METHOD_LABELS[pMethodKey] || b.paymentMethod;

  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const nights = calculateNights(b.checkInDate, b.checkOutDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Chi tiết đơn đặt phòng</h2>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {b.bookingCode} · Đặt lúc {new Date(b.createdAt).toLocaleString('vi-VN')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {/* Section: Status & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Trạng thái đơn</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${s.class}`}>
                <Icon size={12} /> {s.label}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Thanh toán</span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700">{paymentMethod}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold w-fit ${paymentStatus.class}`}>
                  {paymentStatus.label}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Guest & Hotel */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thông tin khách</p>
              <div className="text-sm space-y-1">
                <p className="font-bold text-gray-900">{b.guestName}</p>
                <p className="text-gray-500">{b.guestPhone}</p>
                <p className="text-gray-500 break-all">{b.guestEmail}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cơ sở lưu trú</p>
              <div className="text-sm space-y-1">
                <p className="font-bold text-gray-900">{b.hotelName}</p>
                <p className="text-gray-500 text-xs">{b.hotelAddress}</p>
                <p className="text-blue-600 font-medium text-[11px]">Chủ: {b.cancelledBy || '---'}</p>
              </div>
            </div>
          </div>

          {/* Section: Stay Details */}
          <div className="bg-blue-50/50 rounded-xl p-4 flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Check-in</p>
              <p className="text-sm font-bold text-blue-900">{new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="px-4 flex flex-col items-center">
              <div className="h-px w-8 bg-blue-200 mb-1"></div>
              <span className="text-[10px] font-black text-blue-600 bg-white border border-blue-100 px-2 py-0.5 rounded-full">{nights} đêm</span>
              <div className="h-px w-8 bg-blue-200 mt-1"></div>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Check-out</p>
              <p className="text-sm font-bold text-blue-900">{new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          {/* Section: Price Breakdown */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chi tiết giá mỗ đêm</p>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              {b.bookingRooms.map(r => (
                <div key={r.id} className="flex justify-between items-center px-4 py-3 text-sm border-b border-gray-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{r.roomTypeName}</span>
                    <span className="text-[11px] text-gray-400">Số lượng: {r.quantity} phòng</span>
                  </div>
                  <span className="font-bold text-gray-900">{Number(r.pricePerNight).toLocaleString('vi-VN')}₫</span>
                </div>
              ))}

              <div className="bg-gray-50/50 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tạm tính</span>
                  <span>{Number(b.subtotal).toLocaleString('vi-VN')}₫</span>
                </div>
                {b.promoCode && (
                  <div className="flex justify-between text-sm text-red-500 font-medium">
                    <span>Khuyến mãi ({b.promoCode})</span>
                    <span>-{Number(b.discountAmount).toLocaleString('vi-VN')}₫</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-blue-600 pt-2 border-t border-gray-200">
                  <span>Tổng tiền</span>
                  <span>{Number(b.totalAmount).toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
          </div>

          {b.status === 'CANCELLED' && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-bold text-red-600 uppercase mb-2">Lý do hủy phòng</p>
              <p className="text-sm text-red-800 leading-relaxed">
                {b.cancelReason || 'Không cung cấp lý do'}
              </p>
              <p className="text-[10px] text-red-400 mt-2 italic">
                Hủy bởi {b.cancelledBy || 'Hệ thống'} vào {' '}
                {b.cancelledAt
                  ? new Date(b.cancelledAt).toLocaleString('vi-VN')
                  : b.updatedAt
                    ? new Date(b.updatedAt).toLocaleString('vi-VN')
                    : new Date(b.createdAt).toLocaleString('vi-VN')
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions - Giữ nguyên logic cũ của bạn */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">Đóng</button>
          {nextStatuses && (
            <div className="flex gap-2">
              {nextStatuses.map(ns => (
                <button
                  key={ns}
                  disabled={isUpdating}
                  onClick={() => onUpdateStatus(b.id, ns)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${ns === 'CANCELLED' || ns === 'NO_SHOW'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                    }`}
                >
                  {isUpdating && <Loader2 size={12} className="animate-spin mr-1 inline" />}
                  {BOOKING_TRANSITION_LABELS[ns] ?? BOOKING_STATUS_CONFIG[ns].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}