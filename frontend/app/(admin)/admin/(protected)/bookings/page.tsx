'use client'

import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { useQueryClient, useQuery, useQueries } from '@tanstack/react-query'
import {
  Search, Eye, X, Loader2, Download, ArrowUpRight,
  ChevronDown, BadgeDollarSign, Percent, TrendingDown,
} from 'lucide-react'
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
import bookingApi from '@/lib/api/booking.api'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(val: number) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
  return val.toLocaleString('vi-VN')
}

function calcNights(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime()
  return Math.ceil(ms / 86_400_000)
}

// ── Commission Summary Strip ───────────────────────────────────────────────────
function CommissionStrip({ bookings }: { bookings: BookingResponse[] }) {
  const completed = bookings.filter(b => b.status === 'COMPLETED')
  const totalGross = completed.reduce((s, b) => s + Number(b.totalAmount), 0)
  const totalComm  = completed.reduce((s, b) => s + Number(b.commissionAmount ?? 0), 0)
  const totalNet   = completed.reduce((s, b) => s + Number(b.hotelNetAmount ?? 0), 0)
  const avgPct     = completed.length > 0
    ? (completed.reduce((s, b) => s + Number(b.commissionPercent ?? 0), 0) / completed.length).toFixed(1)
    : '0.0'

  const items = [
    { label: 'Doanh thu gộp (trang hiện tại)', val: totalGross, color: '#6366F1', icon: TrendingDown },
    { label: 'Tổng hoa hồng hệ thống',         val: totalComm,  color: '#F59E0B', icon: Percent },
    { label: 'Net chủ KS nhận',                val: totalNet,   color: '#10B981', icon: BadgeDollarSign },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 12, marginBottom: 20 }}>
      {items.map(({ label, val, color, icon: Icon }) => (
        <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon size={13} color={color} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            {fmt(val)} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>₫</span>
          </p>
          <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 4 }}>Đơn hoàn thành · {completed.length} đơn</p>
        </div>
      ))}

      {/* Avg commission rate */}
      <div style={{ background: '#0F172A', borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#f1f2f4', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tỷ lệ TB</span>
        <div>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', margin: 0, letterSpacing: '-0.03em' }}>{avgPct}%</p>
          <p style={{ fontSize: 10, color: '#f7f7f7', marginTop: 4 }}>Hoa hồng trung bình</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminBookingsPage() {
  const [keyword, setKeyword]       = useState('')
  const [statusFilter, setStatus]   = useState<BookingStatus | ''>('')
  const [hotelFilter, setHotel]     = useState<number | ''>('')
  const [ownerFilter, setOwner]     = useState('')
  const [page, setPage]             = useState(0)
  const [pageSize, setPageSize]     = useState(10)
  const [detail, setDetail]         = useState<BookingResponse | null>(null)
  const [isExporting, setExporting] = useState(false)

  const [debouncedKw] = useDebounce(keyword, 400)
  const ownerId = ownerFilter ? Number(ownerFilter) : undefined

  const { data: pageData, isLoading } = useAdminBookings(page, pageSize, {
    keyword: debouncedKw || undefined,
    status: statusFilter || undefined,
    hotelId: hotelFilter || undefined,
    ownerId,
  })

  const bookings: BookingResponse[] = pageData?.content || []

  const statusQueries = useQueries({
    queries: BOOKING_STAT_STATUSES.map(s => ({
      queryKey: ['admin-booking-count', s],
      queryFn: () => bookingApi.getAll(0, 1, { status: s as BookingStatus }).then(r => r.data.totalElements ?? 0),
      staleTime: 30_000,
    })),
  })
  const stats = Object.fromEntries(BOOKING_STAT_STATUSES.map((s, i) => [s, statusQueries[i].data ?? 0])) as Record<BookingStatus, number>

  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, { params: { page: 0, size: 100 } }).then(r => r.data.content),
  })

  const owners = Array.from(new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values())

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportBookings({ keyword: debouncedKw || undefined, status: statusFilter || undefined, hotelId: hotelFilter || undefined, ownerId })
      toast.success('Xuất file thành công!')
    } catch { toast.error('Xuất file thất bại.') }
    finally { setExporting(false) }
  }

  const reset = () => { setKeyword(''); setStatus(''); setHotel(''); setOwner(''); setPage(0) }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 10,
    fontSize: 13, color: '#374151', outline: 'none', background: '#fff', cursor: 'pointer',
  }

  return (
    <div style={{ padding: '24px 28px', background: '#F8FAFC', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Quản lý đặt phòng</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Tổng <strong style={{ color: '#374151' }}>{pageData?.totalElements?.toLocaleString() ?? 0}</strong> đơn đặt phòng
          </p>
        </div>
        <button onClick={handleExport} disabled={isExporting} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
          background: '#059669', color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 600, cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting ? 0.7 : 1, flexShrink: 0,
        }}>
          {isExporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BOOKING_STAT_STATUSES.length}, 1fr)`, gap: 10, marginBottom: 20 }}>
        {BOOKING_STAT_STATUSES.map(s => {
          const cfg = BOOKING_STATUS_CONFIG[s]
          const Icon = cfg.icon
          const active = statusFilter === s
          return (
            <button key={s} onClick={() => { setStatus(active ? '' : s); setPage(0) }} style={{
              borderRadius: 12, border: `2px solid ${active ? '#3B82F6' : '#E5E7EB'}`,
              padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
              background: active ? '#EFF6FF' : '#fff', transition: 'all .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon size={13} color={active ? '#2563EB' : '#9CA3AF'} />
                <span style={{ fontSize: 10, color: active ? '#2563EB' : '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>{stats[s] ?? 0}</p>
            </button>
          )
        })}
      </div>

      {/* Commission strip — computed from current page bookings */}
      <CommissionStrip bookings={bookings} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input type="text" placeholder="Tìm mã booking, tên, email..." value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(0) }}
            style={{ ...inputStyle, width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
        </div>

        {[
          {
            value: ownerFilter, onChange: (v: string) => { setOwner(v); setHotel(''); setPage(0) },
            opts: [['', 'Tất cả chủ KS'], ...owners.map(o => [String(o.id), o.name])],
          },
          {
            value: String(hotelFilter), onChange: (v: string) => { setHotel(v ? Number(v) : ''); setPage(0) },
            opts: [
              ['', 'Tất cả KS'],
              ...(ownerFilter ? hotels.filter(h => String(h.ownerId) === ownerFilter) : hotels).map(h => [String(h.id), h.hotelName]),
            ],
          },
          {
            value: statusFilter, onChange: (v: string) => { setStatus(v as BookingStatus | ''); setPage(0) },
            opts: [['', 'Tất cả TT'], ...BOOKING_STAT_STATUSES.map(s => [s, BOOKING_STATUS_CONFIG[s].label])],
          },
        ].map(({ value, onChange, opts }, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}

        {(keyword || statusFilter || hotelFilter || ownerFilter) && (
          <button onClick={reset} style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px' }}>
            × Xoá lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {[
                  'Mã booking', 'Khách', 'Khách sạn', 'Ngày đặt', 'Lưu trú',
                  'Doanh thu', 'HC%', 'Hoa hồng', 'Net KS', 'Thanh toán', 'Trạng thái', '',
                ].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '11px 14px',
                    fontSize: 10, fontWeight: 700, color: '#94A3B8',
                    textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                    ...((['Hoa hồng', 'Net KS', 'HC%'].includes(h)) ? { borderLeft: '1px solid #F1F5F9' } : {}),
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '64px 0' }}>
                  <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: '#3B82F6' }} />
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '64px 0', color: '#CBD5E1', fontSize: 13 }}>Không tìm thấy đơn nào</td></tr>
              ) : bookings.map((b: BookingResponse) => {
                const s   = BOOKING_STATUS_CONFIG[b.status]
                const Icon = s.icon
                const nights = calcNights(b.checkInDate, b.checkOutDate)
                const gross  = Number(b.totalAmount)
                const comm   = Number(b.commissionAmount ?? 0)
                const net    = Number(b.hotelNetAmount ?? 0)
                const pct    = b.commissionPercent ?? 0
                const pStatus = PAYMENT_STATUS_CONFIG[b.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]
                const pMethod = b.paymentMethod ? (PAYMENT_METHOD_LABELS[b.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? b.paymentMethod) : null

                return (
                  <tr key={b.id} style={{ borderTop: '1px solid #F8FAFC', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#3B82F6', whiteSpace: 'nowrap' }}>{b.bookingCode}</td>

                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: 12 }}>{b.guestName}</p>
                      <p style={{ color: '#9CA3AF', margin: '2px 0 0', fontSize: 10 }}>{b.guestEmail}</p>
                    </td>

                    <td style={{ padding: '12px 14px', maxWidth: 140 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.hotelName}</p>
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', margin: 0, whiteSpace: 'nowrap' }}>
                        {new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                      </p>
                      <p style={{ fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>→ {new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
                      <span style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 700, color: '#6B7280', background: '#F1F5F9', borderRadius: 6, padding: '1px 6px' }}>{nights} đêm</span>
                    </td>

                    {/* Revenue */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0F172A', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {gross.toLocaleString('vi-VN')}₫
                    </td>

                    {/* Commission columns with left border accent */}
                    <td style={{ padding: '12px 14px', borderLeft: '1px solid #FEF3C7', background: '#FFFEF7' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>{pct}%</span>
                    </td>

                    <td style={{ padding: '12px 14px', background: '#FFFEF7' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', margin: 0, whiteSpace: 'nowrap' }}>{fmt(comm)}₫</p>
                      {b.actualCommissionAmount != null && b.actualCommissionAmount !== comm && (
                        <p style={{ fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>Thực: {fmt(b.actualCommissionAmount)}₫</p>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', background: '#F0FDF4', borderRight: '1px solid #D1FAE5' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{fmt(net)}₫</span>
                    </td>

                    {/* Payment */}
                    <td style={{ padding: '12px 14px' }}>
                      {pMethod && <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', margin: 0 }}>{pMethod}</p>}
                      {pStatus && (
                        <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}
                          className={pStatus.class}>{pStatus.label}</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}
                        className={s.class}>
                        <Icon size={11} /> {s.label}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => setDetail(b)} style={{
                        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer',
                        color: '#6B7280', transition: 'all .12s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280' }}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pageData && pageData.totalPages > 0 && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid #F1F5F9' }}>
            <Pagination
              currentPage={page} pageSize={pageSize}
              totalPages={pageData.totalPages} totalElements={pageData.totalElements}
              onPageChange={setPage} onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <BookingDetailModal
          booking={detail}
          ownerName={hotels.find(h => h.id === detail.hotelId)?.ownerName ?? '---'}
          onClose={() => setDetail(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function BookingDetailModal({ booking: b, ownerName, onClose }: {
  booking: BookingResponse; ownerName: string; onClose: () => void
}) {
  const s       = BOOKING_STATUS_CONFIG[b.status]
  const Icon    = s.icon
  const nights  = calcNights(b.checkInDate, b.checkOutDate)
  const pMethod = b.paymentMethod ? (PAYMENT_METHOD_LABELS[b.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? b.paymentMethod) : null
  const pStatus = PAYMENT_STATUS_CONFIG[(b.paymentStatus ?? 'PENDING') as keyof typeof PAYMENT_STATUS_CONFIG]

  const gross  = Number(b.totalAmount)
  const comm   = Number(b.commissionAmount ?? 0)
  const actual = Number(b.actualCommissionAmount ?? comm)
  const net    = Number(b.hotelNetAmount ?? (gross - actual))
  const pct    = b.commissionPercent ?? 0

  const section = (title: string) => (
    <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{title}</p>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>Chi tiết đơn đặt phòng</h2>
            <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 }}>
              #{b.bookingCode} · {new Date(b.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', color: '#6B7280',
          }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status + Payment row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 14px' }}>
              {section('Trạng thái đơn')}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }} className={s.class}>
                <Icon size={12} /> {s.label}
              </span>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 14px' }}>
              {section('Thanh toán')}
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{pMethod ?? '—'}</p>
              {pStatus && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }} className={pStatus.class}>{pStatus.label}</span>}
            </div>
          </div>

          {/* Guest + Hotel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
            <div>
              {section('Khách hàng')}
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{b.guestName}</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0' }}>{b.guestPhone}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0', wordBreak: 'break-all' }}>{b.guestEmail}</p>
            </div>
            <div>
              {section('Cơ sở lưu trú')}
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{b.hotelName}</p>
              <p style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, margin: 0 }}>Chủ: {ownerName}</p>
            </div>
          </div>

          {/* Stay */}
          <div style={{ background: '#EFF6FF', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Check-in</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF', margin: 0 }}>{new Date(b.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', background: '#fff', border: '1px solid #BFDBFE', borderRadius: 999, padding: '4px 12px' }}>
              {nights} đêm
            </span>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>Check-out</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF', margin: 0 }}>{new Date(b.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          {/* Commission breakdown — highlighted */}
          <div style={{ background: '#0F172A', borderRadius: 14, padding: '18px 20px' }}>
            {section('Phân tích hoa hồng')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 14 }}>
              {[
                { label: 'Doanh thu gộp', val: gross, color: '#94A3B8' },
                { label: 'Hoa hồng hệ thống', val: actual, color: '#F59E0B' },
                { label: 'Chủ KS nhận', val: net, color: '#34D399' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>{fmt(val)}<span style={{ fontSize: 10, fontWeight: 500, marginLeft: 1 }}>₫</span></p>
                </div>
              ))}
            </div>
            {/* progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: '#64748B' }}>Tỷ lệ hoa hồng đặt</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{pct}%</span>
              </div>
              <div style={{ height: 5, background: '#1E293B', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: '#F59E0B', borderRadius: 999 }} />
              </div>
              {b.commissionAmount !== b.actualCommissionAmount && b.actualCommissionAmount != null && (
                <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                  Dự kiến: {fmt(comm)}₫ · Thực thu: <span style={{ color: '#34D399', fontWeight: 700 }}>{fmt(actual)}₫</span>
                </p>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px' }}>
            {section('Chi tiết giá')}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#6B7280' }}>
              <span>Tạm tính</span>
              <span>{Number(b.subtotal).toLocaleString('vi-VN')}₫</span>
            </div>
            {b.discountAmount && Number(b.discountAmount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#10B981' }}>
                <span>Khuyến mãi {b.promoCode ? `(${b.promoCode})` : ''}</span>
                <span>-{Number(b.discountAmount).toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E5E7EB', fontSize: 15, fontWeight: 800, color: '#1E40AF' }}>
              <span>Tổng tiền</span>
              <span>{gross.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          {/* Cancel info */}
          {b.cancelReason && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Lý do huỷ</p>
              <p style={{ fontSize: 12, color: '#991B1B', margin: 0 }}>{b.cancelReason}</p>
              {b.cancelledBy && <p style={{ fontSize: 10, color: '#FCA5A5', marginTop: 4 }}>Bởi: {b.cancelledBy} · {b.cancelledAt ? new Date(b.cancelledAt).toLocaleString('vi-VN') : ''}</p>}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 28px', background: '#0F172A', color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>Đóng</button>
        </div>
      </div>
    </div>
  )
}