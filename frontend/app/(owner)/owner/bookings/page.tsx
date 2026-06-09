'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import {
  Search, Eye, X, Loader2, ChevronLeft, ChevronRight,
  Download, Percent, BadgeDollarSign, TrendingUp,
} from 'lucide-react'
import bookingApi from '@/lib/api/booking.api'
import { BookingResponse, BookingStatus } from '@/types/booking.types'
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
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcNights(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime()
  return Math.ceil(ms / 86_400_000)
}

// ── Commission Summary Strip ───────────────────────────────────────────────────
function CommissionStrip({ bookings }: { bookings: BookingResponse[] }) {
  const completed = bookings.filter(b => b.status === 'COMPLETED')
  const totalGross = completed.reduce((s, b) => s + Number(b.totalAmount), 0)
  const totalComm = completed.reduce((s, b) => s + Number(b.commissionAmount ?? 0), 0)
  const totalNet = completed.reduce((s, b) => s + Number(b.hotelNetAmount ?? 0), 0)
  const avgPct = completed.length > 0
    ? (completed.reduce((s, b) => s + Number(b.commissionPercent ?? 0), 0) / completed.length).toFixed(1)
    : '0.0'

  return (
    <div className="grid grid-cols-4 gap-3">
      {([
        { label: 'Doanh thu gộp', val: totalGross, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', icon: TrendingUp },
        { label: 'Hoa hồng hệ thống', val: totalComm, color: 'text-amber-600', bg: 'bg-amber-50  border-amber-100', icon: Percent },
        { label: 'Net chủ KS nhận', val: totalNet, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: BadgeDollarSign },
      ] as const).map(({ label, val, color, bg, icon: Icon }) => (
        <div key={label} className={cn('rounded-2xl border p-5 relative overflow-hidden', bg)}>
          <div className="flex items-center gap-2 mb-3">
            <Icon size={14} className={color} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
          </div>
          <p className={cn('text-xl font-black leading-none', color)}>
            {val.toLocaleString('vi-VN')}<span className="text-xs font-medium ml-0.5 text-gray-400">₫</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1.5">{completed.length} đơn hoàn thành (trang này)</p>
        </div>
      ))}

    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
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

  // ── Main table data ──
  const { data: bookingsPage, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['owner-bookings', activeHotelId, currentPage, keyword, statusFilter],
    queryFn: () => bookingApi.getAll(currentPage, pageSize, {
      keyword: keyword || undefined,
      status: statusFilter || undefined,
      hotelId: activeHotelId ?? undefined,
    }).then(r => r.data),
    enabled: !!activeHotelId,
  })

  // ── Stat counts: 1 query per status (size=1, chỉ lấy totalElements) ──
  const statusQueries = useQueries({
    queries: BOOKING_STAT_STATUSES.map(s => ({
      queryKey: ['owner-booking-count', activeHotelId, s],
      queryFn: () => bookingApi.getAll(0, 1, {
        status: s as BookingStatus,
        hotelId: activeHotelId ?? undefined,
      }).then(r => r.data.totalElements ?? 0),
      enabled: !!activeHotelId,
      staleTime: 30_000,
    })),
  })

  const stats = Object.fromEntries(
    BOOKING_STAT_STATUSES.map((s, i) => [s, statusQueries[i].data ?? 0])
  ) as Record<BookingStatus, number>

  // ── Status update ──
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      bookingApi.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['owner-bookings', activeHotelId] })
      queryClient.invalidateQueries({ queryKey: ['owner-booking-count', activeHotelId] })
      toast.success(`Đã cập nhật: ${BOOKING_STATUS_CONFIG[vars.status]?.label ?? vars.status}`)
      setDetailBooking(null)
    },
    onError: () => toast.error('Không thể cập nhật trạng thái'),
  })

  const bookings: BookingResponse[] = bookingsPage?.content ?? []
  const isLoading = isBookingsLoading || isHotelLoading

  // ── Export ──
  const handleExport = async () => {
    if (!activeHotelId) return
    setIsExporting(true)
    try {
      await exportBookings({ keyword: keyword || undefined, status: statusFilter || undefined, hotelId: activeHotelId })
      toast.success('Xuất file thành công!')
    } catch { toast.error('Xuất file thất bại, vui lòng thử lại.') }
    finally { setIsExporting(false) }
  }

  if (!activeHotel && !isHotelLoading) {
    return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý đặt phòng</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeHotel?.hotelName} · Tổng <strong className="text-gray-700">{bookingsPage?.totalElements ?? 0}</strong> đơn
          </p>
        </div>
        <button onClick={handleExport} disabled={isExporting || !activeHotelId}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shrink-0">
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* ── Status chips ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {BOOKING_STAT_STATUSES.map(s => {
          const cfg = BOOKING_STATUS_CONFIG[s]
          const Icon = cfg.icon
          const active = statusFilter === s
          return (
            <button key={s} onClick={() => handleStatusChange(active ? '' : s)}
              className={cn(
                'rounded-2xl border-2 p-3 text-left transition-all',
                active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              )}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={13} className={active ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-tight">{cfg.label}</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{stats[s] ?? 0}</p>
            </button>
          )
        })}
      </div>

      {/* ── Commission strip (current page) ── */}
      <CommissionStrip bookings={bookings} />

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm tên, email, mã booking..."
            value={keyword} onChange={e => handleKeywordChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>

        <select value={statusFilter} onChange={e => handleStatusChange(e.target.value as BookingStatus | '')}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STAT_STATUSES.map(s => (
            <option key={s} value={s}>{BOOKING_STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {(keyword || statusFilter) && (
          <button onClick={() => { handleKeywordChange(''); handleStatusChange('') }}
            className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
            × Xoá lọc
          </button>
        )}
      </div>

      {(keyword || statusFilter) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          📌 File Excel sẽ xuất theo bộ lọc đang áp dụng.
        </p>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Mã booking', 'Khách', 'Ngày đặt', 'Lưu trú',
                  'Doanh thu', 'Hoa hồng', 'Net KS',
                  'Thanh toán', 'Trạng thái', '',
                ].map(h => (
                  <th key={h} className={cn(
                    'text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap',
                    ['Hoa hồng', 'Net KS'].includes(h) && 'border-l border-gray-100',
                  )}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={11} className="text-center py-16">
                  <Loader2 size={22} className="animate-spin text-blue-500 mx-auto" />
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16 text-gray-400 text-sm">
                  Không có đơn đặt phòng nào
                </td></tr>
              ) : bookings.map((b: BookingResponse) => {
                const s = BOOKING_STATUS_CONFIG[b.status]
                const Icon = s.icon
                const nextSts = BOOKING_STATUS_TRANSITIONS[b.status]
                const isUpdating = updateStatusMutation.isPending && updateStatusMutation.variables?.id === b.id
                const nights = calcNights(b.checkInDate, b.checkOutDate)
                const gross = Number(b.totalAmount)
                const comm = Number(b.commissionAmount ?? 0)
                const net = Number(b.hotelNetAmount ?? 0)
                const pct = b.commissionPercent ?? 0
                const pStatus = PAYMENT_STATUS_CONFIG[b.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]
                const pMethod = b.paymentMethod
                  ? (PAYMENT_METHOD_LABELS[b.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? b.paymentMethod)
                  : null

                return (
                  <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Mã */}
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                      {b.bookingCode}
                    </td>

                    {/* Khách */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{b.guestName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{b.guestEmail}</p>
                    </td>

                    {/* Ngày đặt */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                      <p className="text-[10px] text-gray-400">
                        {new Date(b.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    {/* Lưu trú */}
                    <td className="px-4 py-3 text-xs">
                      <p className="font-bold text-gray-900 whitespace-nowrap">
                        {new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        → {new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                      </p>
                      <span className="mt-1 inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold">
                        {nights} đêm
                      </span>
                    </td>

                    {/* Doanh thu */}
                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                      {gross.toLocaleString('vi-VN')}₫
                    </td>

                    {/* Hoa hồng */}
                    <td className="px-4 py-3 bg-amber-50/40">
                      <p className="text-sm font-bold text-amber-600 whitespace-nowrap">
                        {comm.toLocaleString('vi-VN')}₫
                      </p>
                      {b.actualCommissionAmount != null && Number(b.actualCommissionAmount) !== comm && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Thực: {Number(b.actualCommissionAmount).toLocaleString('vi-VN')}₫
                        </p>
                      )}
                    </td>

                    {/* Net KS */}
                    <td className="px-4 py-3 bg-emerald-50/40 border-r border-emerald-100">
                      <span className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                        {net.toLocaleString('vi-VN')}₫
                      </span>
                    </td>

                    {/* Thanh toán */}
                    <td className="px-4 py-3">
                      {pMethod && (
                        <p className="text-xs font-medium text-gray-600">{pMethod}</p>
                      )}
                      {b.paymentStatus && pStatus && (
                        <span className={cn('inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', pStatus.class)}>
                          {pStatus.label}
                        </span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-3">
                      {nextSts ? (
                        <select disabled={isUpdating} value={b.status}
                          onChange={e => updateStatusMutation.mutate({ id: b.id, status: e.target.value as BookingStatus })}
                          className={cn('text-xs font-bold px-2.5 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-blue-500 cursor-pointer', s.class)}>
                          <option value={b.status}>{s.label}</option>
                          {nextSts.map(ns => (
                            <option key={ns} value={ns}>{BOOKING_TRANSITION_LABELS[ns] ?? ns}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full', s.class)}>
                          <Icon size={11} />{s.label}
                        </span>
                      )}
                    </td>

                    {/* Chi tiết */}
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetailBooking(b)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {bookingsPage && bookingsPage.totalPages > 1 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, bookingsPage.totalElements)} / {bookingsPage.totalElements} đơn
            </p>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-white transition-colors">
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm font-semibold text-gray-700 px-1">
                {currentPage + 1} / {bookingsPage.totalPages}
              </span>
              <button disabled={currentPage >= bookingsPage.totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-white transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
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

// ── Detail Modal ───────────────────────────────────────────────────────────────
interface BookingDetailModalProps {
  booking: BookingResponse
  onClose: () => void
  onUpdateStatus: (id: number, status: BookingStatus) => void
  isUpdating: boolean
}

function BookingDetailModal({ booking: b, onClose, onUpdateStatus, isUpdating }: BookingDetailModalProps) {
  const s = BOOKING_STATUS_CONFIG[b.status]
  const Icon = s.icon
  const nights = calcNights(b.checkInDate, b.checkOutDate)
  const nextSts = BOOKING_STATUS_TRANSITIONS[b.status]
  const pStatusKey = (b.paymentStatus ?? 'PENDING') as keyof typeof PAYMENT_STATUS_CONFIG
  const paymentCfg = PAYMENT_STATUS_CONFIG[pStatusKey]
  const paymentMethod = b.paymentMethod
    ? (PAYMENT_METHOD_LABELS[b.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? b.paymentMethod)
    : '—'

  const gross = Number(b.totalAmount)
  const comm = Number(b.commissionAmount ?? 0)
  const actual = Number(b.actualCommissionAmount ?? comm)
  const net = Number(b.hotelNetAmount ?? (gross - actual))
  const pct = b.commissionPercent ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <div>
            <h2 className="font-black text-gray-900 text-base">Chi tiết Booking #{b.bookingCode}</h2>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              Đặt lúc {new Date(b.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-xl text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Cancel info */}
          {b.status === 'CANCELLED' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1.5">Thông tin huỷ</p>
              <p className="text-sm text-red-700 font-medium">{b.cancelReason || 'Không có lý do cụ thể'}</p>
              <div className="text-[10px] text-red-400 mt-2 flex justify-between">
                <span>Bởi: {b.cancelledBy ?? 'Hệ thống'}</span>
                <span>{b.cancelledAt ? new Date(b.cancelledAt).toLocaleString('vi-VN') : '---'}</span>
              </div>
            </div>
          )}

          {/* Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Trạng thái</p>
              {nextSts ? (
                <select disabled={isUpdating} value={b.status}
                  onChange={e => onUpdateStatus(b.id, e.target.value as BookingStatus)}
                  className={cn('text-xs font-bold px-2.5 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full', s.class)}>
                  <option value={b.status}>{s.label}</option>
                  {nextSts.map(ns => (
                    <option key={ns} value={ns}>{BOOKING_TRANSITION_LABELS[ns] ?? ns}</option>
                  ))}
                </select>
              ) : (
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full', s.class)}>
                  <Icon size={12} />{s.label}
                </span>
              )}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Thanh toán</p>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">{paymentMethod}</p>
              {paymentCfg && (
                <span className={cn('inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', paymentCfg.class)}>
                  {paymentCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Guest info */}
          <div className="border border-gray-100 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Khách lưu trú</p>
            <p className="text-sm font-bold text-gray-900">{b.guestName}</p>
            <p className="text-xs text-gray-500 mt-1">{b.guestPhone} · {b.guestEmail}</p>
          </div>

          {/* Stay strip */}
          <div className="bg-blue-50 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-center">
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Check-in</p>
              <p className="text-sm font-black text-blue-900">
                {new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}
              </p>
            </div>
            <span className="text-xs font-black text-blue-600 bg-white border border-blue-100 px-3 py-1 rounded-full">
              {nights} đêm
            </span>
            <div className="text-center">
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Check-out</p>
              <p className="text-sm font-black text-blue-900">
                {new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Commission dark block */}
          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Phân tích hoa hồng</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {([
                { l: 'Doanh thu gộp', v: gross, c: '#94A3B8' },
                { l: 'Hoa hồng hệ thống', v: actual, c: '#F59E0B' },
                { l: 'Chủ KS nhận', v: net, c: '#34D399' },
              ] as const).map(({ l, v, c }) => (
                <div key={l}>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{l}</p>
                  <p className="text-base font-black leading-none" style={{ color: c }}>
                    {v.toLocaleString('vi-VN')}<span className="text-[10px] font-medium ml-0.5">₫</span>
                  </p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] text-slate-500">Tỷ lệ hoa hồng</span>
                <span className="text-xs font-bold text-amber-400">{pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              {b.commissionAmount !== b.actualCommissionAmount && b.actualCommissionAmount != null && (
                <p className="text-[10px] text-slate-500 mt-2">
                  Dự kiến: {comm.toLocaleString('vi-VN')}₫ · Thực thu:{' '}
                  <span className="text-emerald-400 font-bold">{actual.toLocaleString('vi-VN')}₫</span>
                </p>
              )}
            </div>
          </div>

          {/* Pricing breakdown */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Chi tiết giá phòng</p>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              {b.bookingRooms.map(room => (
                <div key={room.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{room.roomTypeName}</p>
                    <p className="text-[11px] text-gray-400">
                      {room.quantity} phòng × {nights} đêm × {room.pricePerNight.toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">
                    {(room.pricePerNight * room.quantity * nights).toLocaleString('vi-VN')}₫
                  </p>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tạm tính</span>
                  <span>{Number(b.subtotal).toLocaleString('vi-VN')}₫</span>
                </div>
                {b.promoCode && (
                  <div className="flex justify-between text-xs text-emerald-600 font-medium">
                    <span>Mã giảm ({b.promoCode})</span>
                    <span>-{Number(b.discountAmount ?? 0).toLocaleString('vi-VN')}₫</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900 text-sm">Tổng khách trả</span>
                  <span className="text-xl font-black text-blue-600">{gross.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Trạng thái TT:</span>
            {paymentCfg && (
              <span className={cn('text-[11px] font-bold px-3 py-1 rounded-full border', paymentCfg.class)}>
                {paymentCfg.label}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}