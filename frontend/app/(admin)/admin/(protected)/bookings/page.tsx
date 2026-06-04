'use client'

import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Search, Eye, X, Loader2, Download } from 'lucide-react'
import { BookingResponse, BookingStatus } from '@/types/booking.types'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'
import { HotelResponse } from '@/lib/api/hotel.api'
import API_CONFIG from '@/config/api.config'
import Pagination from '@/components/ui/Pagination'
import { useAdminBookings } from '@/hooks/useBooking'
import {
  BOOKING_STATUS_CONFIG,
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

  const selectedOwnerId = ownerFilter ? Number(ownerFilter) : undefined

  // Lấy dữ liệu chính cho bảng
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

  // Lấy dữ liệu để tính toán Thống kê (Stats) giống Owner
  const { data: statsPage } = useAdminBookings(0, 10000, {})
  const statsBookings = statsPage?.content || []
  
  // Cách tính stats chuẩn để đảm bảo hiện số giống Owner
  const stats = Object.fromEntries(
    BOOKING_STAT_STATUSES.map(s => [
      s, 
      statsBookings.filter((b: BookingResponse) => b.status === s).length
    ])
  ) as Record<BookingStatus, number>

  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, {
      params: { page: 0, size: 100 }
    }).then(r => r.data.content),
  })

  const owners = Array.from(
    new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values()
  )

  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

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

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shrink-0"
        >
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Stat cards - ĐÃ ĐỒNG BỘ GIỐNG OWNER */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {BOOKING_STAT_STATUSES.map((s) => {
          const config = BOOKING_STATUS_CONFIG[s]
          const Icon = config.icon
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => handleStatusChange(active ? '' : s)}
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

      {/* Filter bar - ĐÃ CHỈNH LẠI KHOẢNG CÁCH */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã booking, tên, email..."
            value={keyword}
            onChange={e => handleKeywordChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={ownerFilter}
          onChange={e => handleOwnerChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả chủ KS</option>
          {owners.map(o => (
            <option key={o.id} value={String(o.id)}>{o.name}</option>
          ))}
        </select>

        <select
          value={hotelFilter}
          onChange={e => handleHotelChange(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả khách sạn</option>
          {(ownerFilter ? hotels.filter(h => String(h.ownerId) === ownerFilter) : hotels).map(h => (
            <option key={h.id} value={h.id}>{h.hotelName}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value as BookingStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STAT_STATUSES.map(s => (
            <option key={s} value={s}>{BOOKING_STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {(keyword || statusFilter || hotelFilter || ownerFilter) && (
          <button
            onClick={() => { handleKeywordChange(''); handleStatusChange(''); handleHotelChange(''); handleOwnerChange('') }}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-2"
          >
            Xoá lọc
          </button>
        )}
      </div>

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
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 size={20} className="animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">Không tìm thấy đơn nào</td>
                </tr>
              ) : (
                bookings.map((b: BookingResponse) => {
                  const s = BOOKING_STATUS_CONFIG[b.status]
                  const Icon = s.icon
                  const ownerName = hotels.find(h => h.id === b.hotelId)?.ownerName ?? '—'
                  const paymentInfo = b.paymentMethod ? (PAYMENT_METHOD_LABELS[b.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? b.paymentMethod) : null
                  const paymentStatus = b.paymentStatus ? PAYMENT_STATUS_CONFIG[b.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] : null
                  const nights = calculateNights(b.checkInDate, b.checkOutDate);

                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{b.bookingCode}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-gray-900 text-sm">{b.guestName}</div>
                        <div className="text-gray-400">{b.guestEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-gray-800 line-clamp-1">{b.hotelName}</div>
                        <div className="text-gray-400">Chủ: {ownerName}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                        <div className="text-[10px] opacity-70">
                           {new Date(b.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="font-bold text-gray-900">{new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}</div>
                        <div className="text-gray-400">→ {new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">
                          {nights} đêm
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-gray-600">{paymentInfo ?? '—'}</div>
                        {paymentStatus && (
                          <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${paymentStatus.class}`}>
                            {paymentStatus.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${s.class}`}>
                          <Icon size={12} /> {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailBooking(b)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        >
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
          ownerName={hotels.find(h => h.id === detailBooking.hotelId)?.ownerName ?? '---'}
          onClose={() => setDetailBooking(null)}
        />
      )}
    </div>
  )
}

// Giữ nguyên Detail Modal View-only như đã chỉnh sửa ở lượt trước
function BookingDetailModal({ booking: b, ownerName, onClose }: {
  booking: BookingResponse
  ownerName: string
  onClose: () => void
}) {
  const s = BOOKING_STATUS_CONFIG[b.status]
  const Icon = s.icon

  const pStatusKey = (b.paymentStatus || 'PENDING') as keyof typeof PAYMENT_STATUS_CONFIG;
  const paymentStatus = PAYMENT_STATUS_CONFIG[pStatusKey];

  const pMethodKey = (b.paymentMethod || 'CASH') as keyof typeof PAYMENT_METHOD_LABELS;
  const paymentMethod = PAYMENT_METHOD_LABELS[pMethodKey as keyof typeof PAYMENT_METHOD_LABELS] || b.paymentMethod;

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

          {/* Guest & Hotel */}
          <div className="grid grid-cols-2 gap-6 border-t pt-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Khách hàng</p>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{b.guestName}</p>
                <p className="text-gray-500 text-xs">{b.guestPhone}</p>
                <p className="text-gray-500 text-xs break-all">{b.guestEmail}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cơ sở lưu trú</p>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{b.hotelName}</p>
                <p className="text-blue-600 font-medium text-[11px]">Chủ: {ownerName || '---'}</p>
              </div>
            </div>
          </div>

          {/* Stay Info */}
          <div className="bg-blue-50/50 rounded-xl p-4 flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Check-in</p>
              <p className="text-sm font-bold text-blue-900">{new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="px-4 text-center">
              <span className="text-[10px] font-black text-blue-600 bg-white border border-blue-100 px-2 py-0.5 rounded-full">{nights} đêm</span>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Check-out</p>
              <p className="text-sm font-bold text-blue-900">{new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chi tiết giá</p>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50/50 p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tạm tính</span>
                  <span>{Number(b.subtotal).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-base font-black text-blue-600 pt-2 border-t border-gray-200">
                  <span>Tổng tiền</span>
                  <span>{Number(b.totalAmount).toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
          <button 
            onClick={onClose} 
            className="px-8 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}