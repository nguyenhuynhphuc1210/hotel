'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, X, Loader2 } from 'lucide-react'
import bookingApi from '@/lib/api/booking.api'
import { BookingResponse, BookingStatus } from '@/types/booking.types'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'
import { HotelResponse } from '@/lib/api/hotel.api'
import API_CONFIG from '@/config/api.config'
import {
  BOOKING_STATUS_CONFIG,
  BOOKING_STATUS_TRANSITIONS,
  BOOKING_TRANSITION_LABELS,
  BOOKING_STAT_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_CONFIG,
} from '@/config/booking-status.config'

export default function AdminBookingsPage() {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [hotelFilter, setHotelFilter] = useState<number | ''>('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [detailBooking, setDetailBooking] = useState<BookingResponse | null>(null)
  const queryClient = useQueryClient()

  const { data: allBookings = [], isLoading: isBookingsLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => bookingApi.getAll().then(r => r.data),
  })

  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS).then(r => r.data),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      bookingApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      const label = BOOKING_STATUS_CONFIG[vars.status]?.label ?? vars.status
      toast.success(`Đã cập nhật: ${label}`)
      setDetailBooking((prev) => (prev?.id === vars.id ? null : prev))
    },
    onError: () => toast.error('Không thể cập nhật trạng thái'),
  })

  const owners = Array.from(
    new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values()
  )

  const filtered = allBookings.filter((b: BookingResponse) => {
    const matchKeyword = !keyword ||
      b.guestName.toLowerCase().includes(keyword.toLowerCase()) ||
      b.guestEmail.toLowerCase().includes(keyword.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(keyword.toLowerCase()) ||
      b.hotelName.toLowerCase().includes(keyword.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    const matchHotel = !hotelFilter || b.hotelId === hotelFilter
    const ownerHotelIds = ownerFilter
      ? hotels.filter(h => String(h.ownerId) === ownerFilter).map(h => h.id)
      : null
    const matchOwner = !ownerFilter || (ownerHotelIds?.includes(b.hotelId) ?? false)
    return matchKeyword && matchStatus && matchHotel && matchOwner
  })

  const stats = BOOKING_STAT_STATUSES.reduce((acc, s) => {
    acc[s] = allBookings.filter((b: BookingResponse) => b.status === s).length
    return acc
  }, {} as Record<BookingStatus, number>)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đặt phòng</h1>
        <p className="text-sm text-gray-500 mt-1">Hệ thống Admin · Tổng {allBookings.length} đơn đặt phòng</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {BOOKING_STAT_STATUSES.map((s) => {
          const { label, icon: Icon } = BOOKING_STATUS_CONFIG[s]
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
            placeholder="Tìm mã, khách, email, tên KS..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={ownerFilter}
          onChange={e => { setOwnerFilter(e.target.value); setHotelFilter('') }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả chủ KS</option>
          {owners.map(o => (
            <option key={o.id} value={String(o.id)}>{o.name}</option>
          ))}
        </select>

        <select
          value={hotelFilter}
          onChange={e => setHotelFilter(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả khách sạn</option>
          {(ownerFilter ? hotels.filter(h => String(h.ownerId) === ownerFilter) : hotels).map(h => (
            <option key={h.id} value={h.id}>{h.hotelName}</option>
          ))}
        </select>

        {(keyword || statusFilter || hotelFilter || ownerFilter) && (
          <button
            onClick={() => { setKeyword(''); setStatusFilter(''); setHotelFilter(''); setOwnerFilter('') }}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Mã booking</th>
              <th className="text-left px-4 py-3">Khách</th>
              <th className="text-left px-4 py-3">Khách sạn</th>
              <th className="text-left px-4 py-3">Ngày lưu trú</th>
              <th className="text-left px-4 py-3">Tổng tiền</th>
              <th className="text-left px-4 py-3">Thanh toán</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isBookingsLoading && (
              <tr><td colSpan={8} className="text-center py-12">
                <Loader2 size={20} className="animate-spin text-gray-300 mx-auto" />
              </td></tr>
            )}
            {!isBookingsLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Không tìm thấy đơn nào</td></tr>
            )}
            {filtered.map((b: BookingResponse) => {
              const s = BOOKING_STATUS_CONFIG[b.status]
              const Icon = s.icon
              const nextStatuses = BOOKING_STATUS_TRANSITIONS[b.status]
              const isUpdatingThis = updateStatusMutation.isPending && updateStatusMutation.variables?.id === b.id
              const ownerName = hotels.find(h => h.id === b.hotelId)?.ownerName ?? '—'
              const paymentInfo = b.paymentMethod ? (PAYMENT_METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod) : null
              const paymentStatus = b.paymentStatus ? PAYMENT_STATUS_CONFIG[b.paymentStatus] : null

              return (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.bookingCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.guestName}</div>
                    <div className="text-xs text-gray-400">{b.guestEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 line-clamp-1">{b.hotelName}</div>
                    <div className="text-xs text-gray-400">Chủ: {ownerName}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div>{new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}</div>
                    <div className="text-gray-400">→ {new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">{paymentInfo ?? '—'}</div>
                    {paymentStatus && (
                      <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatus.class}`}>
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
                          onChange={(e) => updateStatusMutation.mutate({ id: b.id, status: e.target.value as BookingStatus })}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${s.class}`}
                        >
                          <option value={b.status}>{s.label}</option>
                          {nextStatuses.map((ns) => (
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
            })}
          </tbody>
        </table>
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

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function BookingDetailModal({ booking: b, onClose, onUpdateStatus, isUpdating }: {
  booking: BookingResponse
  onClose: () => void
  onUpdateStatus: (id: number, status: BookingStatus) => void
  isUpdating: boolean
}) {
  const s = BOOKING_STATUS_CONFIG[b.status]
  const Icon = s.icon
  const nextStatuses = BOOKING_STATUS_TRANSITIONS[b.status]
  const paymentStatus = b.paymentStatus ? PAYMENT_STATUS_CONFIG[b.paymentStatus] : null
  const paymentMethod = b.paymentMethod ? (PAYMENT_METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod) : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Chi tiết đặt phòng</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{b.bookingCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 divide-y divide-gray-50">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Trạng thái</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>
              <Icon size={11} /> {s.label}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Thanh toán</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{paymentMethod}</span>
              {paymentStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatus.class}`}>
                  {paymentStatus.label}
                </span>
              )}
            </div>
          </div>

          {[
            { label: 'Khách sạn',  value: b.hotelName },
            { label: 'Khách hàng', value: b.guestName },
            { label: 'Email',      value: b.guestEmail },
            { label: 'SĐT',        value: b.guestPhone ?? '—' },
            { label: 'Nhận phòng', value: new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN') },
            { label: 'Trả phòng',  value: new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN') },
            { label: 'Tổng tiền',  value: `${Number(b.totalAmount).toLocaleString('vi-VN')}₫` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}

          {b.bookingRooms?.length > 0 && (
            <div className="py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Phòng đã đặt</p>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                {b.bookingRooms.map((r) => (
                  <div key={r.id} className="flex justify-between items-center px-4 py-2.5 text-sm">
                    <span className="text-gray-700">{r.roomTypeName}<span className="text-gray-400 ml-1">× {r.quantity}</span></span>
                    <span className="font-medium text-gray-900">{Number(r.pricePerNight).toLocaleString('vi-VN')}₫/đêm</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
            Đóng
          </button>
          {nextStatuses && (
            <div className="flex gap-2">
              {nextStatuses.map((ns) => {
                const isDanger = ns === 'CANCELLED' || ns === 'NO_SHOW'
                return (
                  <button
                    key={ns}
                    disabled={isUpdating}
                    onClick={() => onUpdateStatus(b.id, ns)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                      isDanger ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isUpdating && <Loader2 size={12} className="animate-spin" />}
                    {BOOKING_TRANSITION_LABELS[ns] ?? BOOKING_STATUS_CONFIG[ns].label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}