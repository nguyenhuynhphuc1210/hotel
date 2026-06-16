'use client'

import { useState, useMemo } from 'react'
import { usePayments } from '@/hooks/usePayment'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'
import { PaymentStatus, PaymentResponse, PaymentMethod } from '@/types/payment.types'
import paymentApi from '@/lib/api/payment.api'
import {
  Search, Download, Eye, Loader2, RotateCcw, Building2, User,
  Clock, CheckCircle2, XCircle, AlertCircle, RefreshCcw, X,
  CreditCard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelResponse } from '@/lib/api/hotel.api'
import { exportPayments } from '@/lib/api/export.api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'


const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; badge: string; icon: LucideIcon; color: string }> = {
  PENDING:   { label: 'Chờ xử lý',       dot: 'bg-amber-400',   badge: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',   icon: Clock,        color: 'text-amber-500'   },
  PAID:      { label: 'Đã thanh toán',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icon: CheckCircle2, color: 'text-emerald-500' },
  CANCELLED: { label: 'Đã hủy',         dot: 'bg-gray-400',    badge: 'bg-gray-50    text-gray-600    ring-1 ring-gray-200',    icon: XCircle,      color: 'text-gray-400'    },
  FAILED:    { label: 'Thất bại',        dot: 'bg-red-500',     badge: 'bg-red-50     text-red-700     ring-1 ring-red-200',     icon: AlertCircle,  color: 'text-red-500'     },
  UNPAID:    { label: 'Chưa thanh toán', dot: 'bg-slate-400',   badge: 'bg-slate-50   text-slate-600   ring-1 ring-slate-200',   icon: Clock,        color: 'text-slate-400'   },
  REFUNDED:  { label: 'Hoàn tiền',       dot: 'bg-violet-500',  badge: 'bg-violet-50  text-violet-700  ring-1 ring-violet-200',  icon: RefreshCcw,   color: 'text-violet-500'  },
}

const METHOD_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  VNPAY:         { label: 'VNPay',        dot: 'bg-blue-500',   badge: 'text-blue-600   bg-blue-50   ring-1 ring-blue-200'   },
  MOMO:          { label: 'MoMo',         dot: 'bg-pink-500',   badge: 'text-pink-600   bg-pink-50   ring-1 ring-pink-200'   },
  ZALOPAY:       { label: 'ZaloPay',      dot: 'bg-cyan-500',   badge: 'text-cyan-600   bg-cyan-50   ring-1 ring-cyan-200'   },
  CREDIT_CARD:   { label: 'Thẻ tín dụng',dot: 'bg-indigo-500', badge: 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' },
  BANK_TRANSFER: { label: 'Chuyển khoản', dot: 'bg-teal-500',   badge: 'text-teal-600   bg-teal-50   ring-1 ring-teal-200'   },
  CASH:          { label: 'Tiền mặt',     dot: 'bg-orange-500', badge: 'text-orange-600 bg-orange-50 ring-1 ring-orange-200' },
}

const STAT_STATUSES: PaymentStatus[] = ['UNPAID', 'PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REFUNDED']


function PaymentDetailDrawer({ payment, hotels, onClose }: {
  payment: PaymentResponse | null
  hotels: HotelResponse[]
  onClose: () => void
}) {
  if (!payment) return null
  const cfg    = STATUS_CONFIG[payment.status]
  const method = METHOD_CONFIG[payment.paymentMethod]
  const hotel  = hotels.find(h => h.id === payment.hotelId)

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-y-auto border-l border-slate-200">
        <div className="p-6 bg-gradient-to-br from-blue-700 to-indigo-700 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Chi tiết giao dịch</p>
              <h2 className="text-xl font-bold font-mono">{payment.transactionId || 'N/A'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('px-3 py-1 rounded-full text-xs font-bold bg-white/90', cfg.badge)}>
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', cfg.dot)} />
              {cfg.label}
            </span>
            {method && (
              <span className="text-blue-200 text-xs font-medium">{method.label}</span>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 mb-1">Số tiền</p>
          <p className="text-3xl font-black text-blue-700 tracking-tight">
            {payment.amount.toLocaleString('vi-VN')}
            <span className="text-lg font-semibold text-blue-400 ml-1">₫</span>
          </p>
        </div>

        <div className="p-6 space-y-4 flex-1">
          {[
            { label: 'Mã đặt phòng',    value: payment.bookingCode,   mono: true,  accent: true  },
            { label: 'Booking ID',       value: `#${payment.bookingId}`,mono: true,  accent: false },
            { label: 'Khách sạn',        value: hotel?.hotelName ?? '—',             accent: false },
            { label: 'Chủ sở hữu',       value: hotel?.ownerName ?? '—',             accent: false },
            { label: 'Phương thức',      value: method?.label ?? payment.paymentMethod, accent: false },
            { label: 'Trạng thái',       value: cfg.label,                           accent: false },
            { label: 'Ngày thanh toán',  value: payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('vi-VN') : '---', accent: false },
            { label: 'Ngày tạo',         value: new Date(payment.createdAt).toLocaleString('vi-VN'), accent: false },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-start gap-4">
              <span className="text-xs text-slate-500 shrink-0 pt-0.5">{item.label}</span>
              <span className={cn(
                'text-sm font-semibold text-right break-all',
                item.mono    ? 'font-mono'   : '',
                item.accent  ? 'text-blue-600' : 'text-slate-800',
              )}>{item.value}</span>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </>
  )
}


export default function AdminPaymentsPage() {
  const [currentPage,     setCurrentPage]     = useState(0)
  const [pageSize,        setPageSize]        = useState(10)
  const [searchInput,     setSearchInput]     = useState('')
  const [statusFilter,    setStatusFilter]    = useState<PaymentStatus | ''>('')
  const [methodFilter,    setMethodFilter]    = useState<PaymentMethod | ''>('')
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null)
  const [isExporting,     setIsExporting]     = useState(false)

  const [debouncedSearch] = useDebounce(searchInput, 400)

  
  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn:  () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, { params: { page: 0, size: 1000 } }).then(r => r.data.content),
  })

  
  const owners = useMemo(() =>
    Array.from(new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values()),
    [hotels]
  )

  
  const { data: pageData, isLoading: isLoadingPayments } = usePayments(currentPage, pageSize, {
    search:  debouncedSearch,
    status:  statusFilter,
    method:  methodFilter,
    hotelId: selectedHotelId,
    ownerId: selectedOwnerId,
  })

  const statusQueries = useQueries({
    queries: STAT_STATUSES.map(s => ({
      queryKey: ['admin-payment-count', s, selectedHotelId, selectedOwnerId, methodFilter],
      queryFn:  () => paymentApi.getAll(0, 1, undefined, s, methodFilter || undefined, selectedHotelId ?? undefined)
        .then(r => r.data.totalElements ?? 0),
      staleTime: 30_000,
    })),
  })

  const statsCounts = Object.fromEntries(
    STAT_STATUSES.map((s, i) => [s, statusQueries[i].data ?? 0])
  ) as Record<PaymentStatus, number>

  const payments = pageData?.content ?? []

  const handleClearFilters = () => {
    setSearchInput(''); setStatusFilter(''); setMethodFilter('')
    setSelectedHotelId(null); setSelectedOwnerId(null); setCurrentPage(0)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportPayments({
        keyword: debouncedSearch  || undefined,
        status:  statusFilter     || undefined,
        method:  methodFilter     || undefined,
        hotelId: selectedHotelId  || undefined,
        ownerId: selectedOwnerId  || undefined,
        includeCommission: true,   
      })
      toast.success('Xuất file thành công!')
    } catch { toast.error('Xuất file thất bại.') }
    finally   { setIsExporting(false) }
  }

  const hasFilter = !!(debouncedSearch || statusFilter || methodFilter || selectedHotelId || selectedOwnerId)

  return (
    <div className="space-y-6 pb-10">

      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý giao dịch</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hệ thống Admin · Tổng <strong className="text-gray-700">{pageData?.totalElements?.toLocaleString() ?? 0}</strong> giao dịch
          </p>
        </div>
        <button onClick={handleExport} disabled={isExporting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0">
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_STATUSES.map(status => {
          const cfg    = STATUS_CONFIG[status]
          const Icon   = cfg.icon
          const active = statusFilter === status
          return (
            <button key={status} onClick={() => { setStatusFilter(active ? '' : status); setCurrentPage(0) }}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all bg-white',
                active ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200',
              )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('p-1.5 rounded-lg', active ? 'bg-blue-100' : 'bg-gray-50')}>
                  <Icon size={15} className={cfg.color} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{statsCounts[status] ?? 0}</p>
            </button>
          )
        })}
      </div>

      
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Mã booking, mã giao dịch..." value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setCurrentPage(0) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-white">
          <CreditCard size={14} className="text-gray-400 shrink-0" />
          <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value as PaymentMethod | ''); setCurrentPage(0) }}
            className="py-2.5 bg-transparent text-sm outline-none min-w-[150px]">
            <option value="">Tất cả phương thức</option>
            {Object.entries(METHOD_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-white">
          <User size={14} className="text-gray-400 shrink-0" />
          <select value={selectedOwnerId ?? ''} onChange={e => { setSelectedOwnerId(Number(e.target.value) || null); setSelectedHotelId(null); setCurrentPage(0) }}
            className="py-2.5 bg-transparent text-sm outline-none min-w-[150px]">
            <option value="">Tất cả chủ KS</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-white">
          <Building2 size={14} className="text-gray-400 shrink-0" />
          <select value={selectedHotelId ?? ''} onChange={e => { setSelectedHotelId(Number(e.target.value) || null); setCurrentPage(0) }}
            className="py-2.5 bg-transparent text-sm outline-none min-w-[180px]">
            <option value="">Tất cả khách sạn</option>
            {hotels
              .filter(h => !selectedOwnerId || h.ownerId === selectedOwnerId)
              .map(h => <option key={h.id} value={h.id}>{h.hotelName}</option>)}
          </select>
        </div>

        <button onClick={handleClearFilters}
          className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Xoá lọc">
          <RotateCcw size={16} />
        </button>
      </div>

      
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Mã giao dịch', 'Mã Booking', 'Chủ KS / Khách sạn', 'Số tiền', 'Phương thức', 'Ngày thanh toán', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingPayments ? (
                <tr><td colSpan={8} className="py-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                </td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-gray-400 text-sm">Không có dữ liệu</td></tr>
              ) : payments.map(p => {
                const cfg    = STATUS_CONFIG[p.status]
                const method = METHOD_CONFIG[p.paymentMethod]
                const hotel  = hotels.find(h => h.id === p.hotelId)
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{p.transactionId || '—'}</td>
                    <td className="px-5 py-3.5 font-bold text-blue-600">{p.bookingCode}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-800">{hotel?.ownerName ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{hotel?.hotelName ?? ''}</p>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900 whitespace-nowrap">
                      {p.amount.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-5 py-3.5">
                      {method ? (
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold', method.badge)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', method.dot)} />
                          {method.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">{p.paymentMethod}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {p.paymentDate ? new Date(p.paymentDate).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold', cfg.badge)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelectedPayment(p)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pageData && pageData.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage} pageSize={pageSize}
              totalPages={pageData.totalPages} totalElements={pageData.totalElements}
              onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      <PaymentDetailDrawer
        payment={selectedPayment}
        hotels={hotels}
        onClose={() => setSelectedPayment(null)}
      />
    </div>
  )
}