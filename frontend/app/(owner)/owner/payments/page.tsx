'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOwnerHotel } from '../../owner-hotel-context'
import paymentApi from '@/lib/api/payment.api'
import { PaymentStatus, PaymentResponse } from '@/types/payment.types'
import {
  Search, Download, Eye, Loader2,
  TrendingUp, ArrowUpRight,
  CircleDollarSign, Clock,
  XCircle, ChevronLeft, ChevronRight,
  Building2, SlidersHorizontal,
  RefreshCw, ReceiptText
} from 'lucide-react'

// ─── Pagination ────────────────────────────────────────────────────────────
function Pagination({
  currentPage, pageSize, totalPages, totalElements, onPageChange, onPageSizeChange
}: {
  currentPage: number; pageSize: number; totalPages: number
  totalElements: number; onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void
}) {
  const start = currentPage * pageSize + 1
  const end   = Math.min((currentPage + 1) * pageSize, totalElements)
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
      <span className="text-xs">
        Hiển thị <b className="text-slate-700">{start}–{end}</b> / {totalElements} giao dịch
      </span>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(0) }}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500"
        >
          {[10, 20, 50].map(s => <option key={s} value={s}>{s} / trang</option>)}
        </select>
        <button
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        ><ChevronLeft size={14} /></button>
        <span className="text-xs font-medium px-1">{currentPage + 1} / {Math.max(totalPages, 1)}</span>
        <button
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        ><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

// ─── Config ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; badge: string }> = {
  PAID:      { label: 'Đã thanh toán',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  PENDING:   { label: 'Chờ xử lý',       dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  UNPAID:    { label: 'Chưa thanh toán', dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' },
  FAILED:    { label: 'Thất bại',        dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  CANCELLED: { label: 'Đã hủy',          dot: 'bg-gray-400',    badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200' },
  REFUNDED:  { label: 'Hoàn tiền',       dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
}

const METHOD_COLOR: Record<string, string> = {
  VNPAY:         'text-blue-600 bg-blue-50 ring-1 ring-blue-200',
  MOMO:          'text-pink-600 bg-pink-50 ring-1 ring-pink-200',
  ZALOPAY:       'text-cyan-600 bg-cyan-50 ring-1 ring-cyan-200',
  CREDIT_CARD:   'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200',
  BANK_TRANSFER: 'text-teal-600 bg-teal-50 ring-1 ring-teal-200',
  CASH:          'text-orange-600 bg-orange-50 ring-1 ring-orange-200',
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────
function PaymentDetailDrawer({ payment, onClose }: { payment: PaymentResponse | null; onClose: () => void }) {
  if (!payment) return null
  const cfg = STATUS_CONFIG[payment.status]
  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
        <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-teal-200 text-xs font-medium uppercase tracking-widest mb-1">Chi tiết giao dịch</p>
              <h2 className="text-xl font-bold font-mono">{payment.transactionId || 'N/A'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <XCircle size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.badge} bg-white/90`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
              {cfg.label}
            </span>
            <span className="text-teal-200 text-xs">{payment.paymentMethod}</span>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 mb-1">Số tiền</p>
          <p className="text-3xl font-black text-teal-700 tracking-tight">
            {payment.amount.toLocaleString('vi-VN')}
            <span className="text-lg font-semibold text-teal-500 ml-1">₫</span>
          </p>
        </div>

        <div className="p-6 space-y-4 flex-1">
          {[
            { label: 'Khách sạn',          value: payment.hotelName,       mono: false, accent: false },
            { label: 'Mã đặt phòng',       value: payment.bookingCode,     mono: true,  accent: true  },
            { label: 'Booking ID',          value: `#${payment.bookingId}`, mono: true,  accent: false },
            { label: 'Phương thức',         value: payment.paymentMethod,   mono: false, accent: false },
            { label: 'Ngày thanh toán',     value: payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('vi-VN') : '---', mono: false, accent: false },
            { label: 'Ngày tạo',            value: new Date(payment.createdAt).toLocaleString('vi-VN'), mono: false, accent: false },
            { label: 'Cập nhật lần cuối',  value: new Date(payment.updatedAt).toLocaleString('vi-VN'), mono: false, accent: false },
          ].map(({ label, value, mono, accent }) => (
            <div key={label} className="flex justify-between items-start">
              <span className="text-xs text-slate-500 pt-0.5">{label}</span>
              <span className={`text-sm font-semibold text-right max-w-[60%] break-all ${mono ? 'font-mono' : ''} ${accent ? 'text-teal-600' : 'text-slate-800'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function OwnerPaymentsPage() {
  const { activeHotel, activeHotelId, hotels, setActiveHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  const [pageSize, setPageSize]         = useState(10)
  const [currentPage, setCurrentPage]   = useState(0)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null)

  // Fetch tất cả payments một lần, filter theo hotelId ở FE
  const { data: paymentsPage, isLoading: isPaymentsLoading, refetch } = useQuery({
    queryKey: ['owner-payments-all'],
    queryFn: () => paymentApi.getAll(0, 10000).then(res => res.data),
    enabled: !!activeHotelId,
    staleTime: 1000 * 60 * 2,
  })

  const isLoading = isHotelLoading || isPaymentsLoading

  // ── Filter theo hotelId — đơn giản vì PaymentResponse giờ có hotelId ──────
  const hotelPayments = useMemo(() => {
    if (!paymentsPage?.content || !activeHotelId) return []
    return paymentsPage.content.filter(p => p.hotelId === activeHotelId)
  }, [paymentsPage, activeHotelId])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid    = hotelPayments.filter(p => p.status === 'PAID')
    const pending = hotelPayments.filter(p => p.status === 'PENDING')
    const revenue = paid.reduce((s, p) => s + p.amount, 0)
    return { total: hotelPayments.length, paid: paid.length, pending: pending.length, revenue }
  }, [hotelPayments])

  // ── Search + status filter ────────────────────────────────────────────────
  const filtered = useMemo(() => hotelPayments.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || p.bookingCode?.toLowerCase().includes(q)
      || (p.transactionId?.toLowerCase().includes(q) ?? false)
    const matchStatus = statusFilter === '' || p.status === statusFilter
    return matchSearch && matchStatus
  }), [hotelPayments, search, statusFilter])

  // ── Client-side paging ────────────────────────────────────────────────────
  const totalPages   = Math.ceil(filtered.length / pageSize)
  const pagedResults = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  const handleHotelSwitch = (id: number) => {
    setActiveHotelId(id)
    setCurrentPage(0)
    setSearch('')
    setStatusFilter('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ReceiptText size={20} className="text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Giao dịch thanh toán</h1>
          </div>
          <p className="text-sm text-slate-500">Theo dõi dòng tiền từ các đặt phòng của khách sạn</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-teal-600 disabled:opacity-50 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={15} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* ── Hotel Switcher ── */}
      {hotels.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Building2 size={14} className="text-slate-400 flex-shrink-0" />
          {hotels.map(h => (
            <button
              key={h.id}
              onClick={() => handleHotelSwitch(h.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border
                ${activeHotelId === h.id
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-600'
                }`}
            >
              {h.hotelName}
            </button>
          ))}
        </div>
      )}

      {/* ── Active Hotel Banner ── */}
      {activeHotel && (
        <div className="flex items-center gap-3 bg-white border border-teal-100 rounded-2xl px-5 py-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Đang xem khách sạn</p>
            <p className="text-sm font-bold text-slate-800">{activeHotel.hotelName}</p>
          </div>
          {!isLoading && (
            <div className="ml-auto bg-teal-50 border border-teal-100 rounded-xl px-3 py-1.5 flex-shrink-0">
              <span className="text-xs text-teal-600 font-semibold">{stats.total} giao dịch</span>
            </div>
          )}
          {activeHotel.addressLine && (
            <p className="text-xs text-slate-400 hidden lg:block truncate max-w-[220px]">{activeHotel.addressLine}</p>
          )}
        </div>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-teal-200/50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest">Doanh thu</p>
              <p className="text-3xl font-black mt-1 tracking-tight">
                {stats.revenue.toLocaleString('vi-VN')}
                <span className="text-lg font-medium text-teal-300 ml-1">₫</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CircleDollarSign size={20} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-teal-200 text-xs">
            <ArrowUpRight size={13} />
            <span>{stats.paid} giao dịch thành công</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tổng giao dịch</p>
            <TrendingUp size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">Của khách sạn này</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chờ xử lý</p>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
          <p className="text-xs text-slate-400 mt-1">Cần chú ý</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã đặt phòng, mã giao dịch..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none placeholder:text-slate-400 bg-slate-50/50"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(0) }}
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <select
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-700"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as PaymentStatus | ''); setCurrentPage(0) }}
            >
              <option value="">Tất cả trạng thái</option>
              {(Object.entries(STATUS_CONFIG) as [PaymentStatus, (typeof STATUS_CONFIG)[PaymentStatus]][]).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </div>
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setCurrentPage(0) }}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium px-3 py-2 rounded-xl hover:bg-teal-50 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã giao dịch</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã đặt phòng</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phương thức</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngày thanh toán</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3.5 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-teal-500 mb-3" size={28} />
                    <p className="text-sm text-slate-400">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : !activeHotelId ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Building2 size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400">Chưa chọn khách sạn</p>
                  </td>
                </tr>
              ) : pagedResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <ReceiptText size={32} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400">Không có giao dịch nào</p>
                    {(search || statusFilter) && (
                      <p className="text-xs text-slate-300 mt-1">Thử thay đổi bộ lọc</p>
                    )}
                  </td>
                </tr>
              ) : pagedResults.map(p => {
                const cfg = STATUS_CONFIG[p.status]
                const methodClass = METHOD_COLOR[p.paymentMethod] || 'text-slate-600 bg-slate-50 ring-1 ring-slate-200'
                return (
                  <tr key={p.id} className="hover:bg-teal-50/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {p.transactionId || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 font-bold text-teal-600 text-sm">{p.bookingCode}</td>
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-800">{p.amount.toLocaleString('vi-VN')}</span>
                      <span className="text-slate-400 text-xs ml-1">₫</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${methodClass}`}>
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {p.paymentDate
                        ? new Date(p.paymentDate).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Xem chi tiết"
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

        {filtered.length > pageSize && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              totalElements={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(0) }}
            />
          </div>
        )}
      </div>

      <PaymentDetailDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
    </div>
  )
}