'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useOwnerHotel } from '../../owner-hotel-context'
import paymentApi from '@/lib/api/payment.api'
import { PaymentStatus, PaymentResponse, PaymentMethod } from '@/types/payment.types'
import statisticApi from '@/lib/api/statistic.api'
import { exportPayments } from '@/lib/api/export.api'

import {
  Search, Download, Eye, Loader2, CircleDollarSign,
  XCircle, ChevronLeft, ChevronRight, RefreshCw,
  ReceiptText, Clock, CheckCircle2, AlertCircle, X,
  TrendingUp, Percent, BadgeDollarSign,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'


function Pagination({ currentPage, pageSize, totalPages, totalElements, onPageChange, onPageSizeChange }: {
  currentPage: number; pageSize: number; totalPages: number; totalElements: number
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void
}) {
  const start = currentPage * pageSize + 1
  const end   = Math.min((currentPage + 1) * pageSize, totalElements)
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
      <span className="text-xs">
        Hiển thị <b className="text-slate-700">{start}–{end}</b> / {totalElements} giao dịch
      </span>
      <div className="flex items-center gap-2">
        <select value={pageSize} onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(0) }}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500">
          {[10, 20, 50].map(s => <option key={s} value={s}>{s} / trang</option>)}
        </select>
        <button disabled={currentPage === 0} onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium px-1">{currentPage + 1} / {Math.max(totalPages, 1)}</span>
        <button disabled={currentPage >= totalPages - 1} onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}


const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; badge: string; icon: LucideIcon; color: string }> = {
  PAID:      { label: 'Đã thanh toán',     dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icon: CheckCircle2, color: 'text-emerald-500' },
  PENDING:   { label: 'Chờ xử lý',         dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       icon: Clock,        color: 'text-amber-500'   },
  UNPAID:    { label: 'Chưa thanh toán',   dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',       icon: Clock,        color: 'text-slate-400'   },
  FAILED:    { label: 'Thất bại',          dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',             icon: AlertCircle,  color: 'text-red-500'     },
  CANCELLED: { label: 'Đã hủy',           dot: 'bg-gray-400',    badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',          icon: XCircle,      color: 'text-gray-400'    },
  REFUNDED:  { label: 'Hoàn tiền',         dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',    icon: RefreshCw,    color: 'text-violet-500'  },
}

const METHOD_CONFIG: Record<string, { label: string; badge: string }> = {
  VNPAY:         { label: 'VNPay',        badge: 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'    },
  MOMO:          { label: 'MoMo',         badge: 'text-pink-600 bg-pink-50 ring-1 ring-pink-200'    },
  ZALOPAY:       { label: 'ZaloPay',      badge: 'text-cyan-600 bg-cyan-50 ring-1 ring-cyan-200'    },
  CREDIT_CARD:   { label: 'Thẻ tín dụng',badge: 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' },
  BANK_TRANSFER: { label: 'Chuyển khoản', badge: 'text-teal-600 bg-teal-50 ring-1 ring-teal-200'   },
  CASH:          { label: 'Tiền mặt',     badge: 'text-orange-600 bg-orange-50 ring-1 ring-orange-200' },
}

const STAT_STATUS_LIST: PaymentStatus[] = ['UNPAID', 'PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REFUNDED']


function PaymentDetailDrawer({ payment, onClose }: { payment: PaymentResponse | null; onClose: () => void }) {
  if (!payment) return null
  const cfg = STATUS_CONFIG[payment.status]
  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-teal-200 text-xs font-medium uppercase tracking-widest mb-1">Chi tiết giao dịch</p>
              <h2 className="text-xl font-bold font-mono">{payment.transactionId || 'N/A'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20"><X size={20} /></button>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.badge} bg-white/90`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
            {cfg.label}
          </span>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 mb-1">Số tiền</p>
          <p className="text-3xl font-black text-teal-700 tracking-tight">
            {payment.amount.toLocaleString('vi-VN')}
            <span className="text-lg font-semibold text-teal-500 ml-1">₫</span>
          </p>
        </div>

        <div className="p-6 space-y-4">
          {[
            { label: 'Khách sạn',      value: payment.hotelName },
            { label: 'Booking',        value: payment.bookingCode },
            { label: 'Phương thức',    value: METHOD_CONFIG[payment.paymentMethod]?.label ?? payment.paymentMethod },
            { label: 'Ngày thanh toán',value: payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('vi-VN') : '---' },
          ].map(item => (
            <div key={item.label} className="flex justify-between gap-4">
              <span className="text-xs text-slate-500">{item.label}</span>
              <span className="text-sm font-semibold text-right text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}


export default function OwnerPaymentsPage() {
  const { activeHotelId, hotels, setActiveHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  const [pageSize,        setPageSize]        = useState(10)
  const [currentPage,     setCurrentPage]     = useState(0)
  const [searchInput,     setSearchInput]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter,    setStatusFilter]    = useState<PaymentStatus | ''>('')
  const [methodFilter,    setMethodFilter]    = useState<PaymentMethod | ''>('')
  const [isExporting,     setIsExporting]     = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null)

  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  
  useEffect(() => { setCurrentPage(0) }, [debouncedSearch, statusFilter, methodFilter, activeHotelId])

  
  const { data: pageData, isLoading: isPaymentsLoading, isFetching } = useQuery({
    queryKey: ['owner-payments', activeHotelId, currentPage, pageSize, debouncedSearch, statusFilter, methodFilter],
    queryFn:  () => paymentApi.getAll(currentPage, pageSize, debouncedSearch || undefined, statusFilter || undefined, methodFilter || undefined, activeHotelId).then(r => r.data),
    enabled:  !!activeHotelId,
  })

  
  
  const statusQueries = useQueries({
    queries: STAT_STATUS_LIST.map(s => ({
      queryKey: ['owner-payment-count', activeHotelId, s],
      queryFn:  () => paymentApi.getAll(0, 1, undefined, s, undefined, activeHotelId)
        .then(r => r.data.totalElements ?? 0),
      enabled:   !!activeHotelId,
      staleTime: 30_000,
    })),
  })

  const statusCounts = Object.fromEntries(
    STAT_STATUS_LIST.map((s, i) => [s, statusQueries[i].data ?? 0])
  ) as Record<PaymentStatus, number>

  
  const { data: dashboardData } = useQuery({
    queryKey: ['owner-payment-revenue', activeHotelId],
    queryFn:  () => statisticApi.getDashboard({ hotelId: activeHotelId! }).then(r => r.data),
    enabled:  !!activeHotelId,
    staleTime: 5 * 60 * 1000,
  })

  const gross      = Number(dashboardData?.summary?.grossRevenue    ?? 0)
  const commission = Number(dashboardData?.summary?.totalCommission ?? 0)
  const net        = Number(dashboardData?.summary?.netRevenue      ?? 0)

  
  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportPayments({
        keyword: debouncedSearch || undefined,
        status:  statusFilter    || undefined,
        method:  methodFilter    || undefined,
        hotelId: activeHotelId   || undefined,
      })
      toast.success('Xuất file thành công!')
    } catch { toast.error('Xuất file thất bại.') }
    finally   { setIsExporting(false) }
  }

  const isLoading = isHotelLoading || isPaymentsLoading

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">

      
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ReceiptText size={20} className="text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900">Giao dịch thanh toán</h1>
          </div>
          <p className="text-sm text-slate-500">Theo dõi dòng tiền khách sạn</p>
        </div>
        <button onClick={handleExport} disabled={isExporting || !activeHotelId}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shrink-0 self-start md:self-center">
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      
      {hotels.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {hotels.map(h => (
            <button key={h.id} onClick={() => { setActiveHotelId(h.id); setCurrentPage(0) }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors shrink-0
                ${activeHotelId === h.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'}`}>
              {h.hotelName}
            </button>
          ))}
        </div>
      )}

      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_STATUS_LIST.map(status => {
          const cfg    = STATUS_CONFIG[status]
          const Icon   = cfg.icon
          const active = statusFilter === status
          return (
            <button key={status} onClick={() => setStatusFilter(active ? '' : status)}
              className={`p-4 rounded-2xl border-2 text-left transition-all bg-white shadow-sm
                ${active ? 'border-teal-500 bg-teal-50/50' : 'border-transparent hover:border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${active ? 'bg-teal-100' : 'bg-slate-50'}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">{cfg.label}</span>
              </div>
              <p className="text-xl font-black text-slate-800">{statusCounts[status] ?? 0}</p>
            </button>
          )
        })}
      </div>

      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Tìm mã đặt phòng, giao dịch..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>

        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value as PaymentMethod | '')}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">Tất cả phương thức</option>
          {Object.entries(METHOD_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>

        <button onClick={() => { setSearchInput(''); setStatusFilter(''); setMethodFilter('') }}
          className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors" title="Làm mới bộ lọc">
          <RefreshCw size={18} />
        </button>
      </div>

      {(debouncedSearch || statusFilter || methodFilter) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          📌 File Excel sẽ được xuất theo bộ lọc đang áp dụng.
        </p>
      )}

      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Mã giao dịch', 'Mã đặt phòng', 'Số tiền', 'Phương thức', 'Ngày thanh toán', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-xs text-slate-400 uppercase font-bold tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading || isFetching ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-teal-500 mb-2" size={28} />
                  <p className="text-slate-400 text-sm">Đang cập nhật dữ liệu...</p>
                </td></tr>
              ) : !pageData || pageData.content.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <ReceiptText size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">Không tìm thấy giao dịch nào</p>
                </td></tr>
              ) : pageData.content.map(p => {
                const cfg    = STATUS_CONFIG[p.status]
                const method = METHOD_CONFIG[p.paymentMethod] ?? { label: p.paymentMethod, badge: 'bg-slate-100 text-slate-600' }
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.transactionId || '—'}</td>
                    <td className="px-6 py-4 font-bold text-teal-600">{p.bookingCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{p.amount.toLocaleString('vi-VN')}₫</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${method.badge}`}>{method.label}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {p.paymentDate ? new Date(p.paymentDate).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedPayment(p)}
                        className="p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pageData && pageData.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
            <Pagination
              currentPage={currentPage} pageSize={pageSize}
              totalPages={pageData.totalPages} totalElements={pageData.totalElements}
              onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      <PaymentDetailDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
    </div>
  )
}