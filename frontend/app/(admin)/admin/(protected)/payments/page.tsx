'use client'

import { useState, useMemo } from 'react'
import { usePayments } from '@/hooks/usePayment'
import { PaymentStatus, PaymentResponse, PaymentMethod } from '@/types/payment.types' // Thêm PaymentMethod vào import
import {
  Search,
  Download,
  Eye,
  Loader2,
  RotateCcw,
  Building2,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCcw, 
  LucideIcon,
  X,
  CreditCard, // Thêm icon cho phương thức thanh toán
} from 'lucide-react'

import Pagination from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelResponse } from '@/lib/api/hotel.api'
import { exportPayments } from '@/lib/api/export.api'
import toast from 'react-hot-toast'
import { useDebounce } from 'use-debounce'

// --- CONFIGS ---
const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; badge: string; icon: LucideIcon; color: string }> = {
  PENDING: { label: 'Chờ xử lý', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', icon: Clock, color: 'text-amber-500' },
  PAID: { label: 'Đã thanh toán', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icon: CheckCircle2, color: 'text-emerald-500' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200', icon: XCircle, color: 'text-gray-400' },
  FAILED: { label: 'Thất bại', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200', icon: AlertCircle, color: 'text-red-500' },
  UNPAID: { label: 'Chưa thanh toán', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200', icon: Clock, color: 'text-slate-400' },
  REFUNDED: { label: 'Hoàn tiền', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', icon: RefreshCcw, color: 'text-violet-500' },
}

const PAYMENT_STAT_STATUSES: PaymentStatus[] = ['UNPAID', 'PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REFUNDED']

const METHOD_CONFIG: Record<string, { label: string; dot: string }> = {
  VNPAY: { label: 'VNPay', dot: 'bg-blue-500' },
  MOMO: { label: 'MoMo', dot: 'bg-pink-500' },
  ZALOPAY: { label: 'ZaloPay', dot: 'bg-cyan-500' },
  CREDIT_CARD: { label: 'Thẻ tín dụng', dot: 'bg-indigo-500' },
  BANK_TRANSFER: { label: 'Chuyển khoản', dot: 'bg-teal-500' },
  CASH: { label: 'Tiền mặt', dot: 'bg-orange-500' },
}

// --- Detail Drawer ---
function PaymentDetailDrawer({ payment, onClose }: { payment: PaymentResponse | null; onClose: () => void }) {
  if (!payment) return null
  const cfg = STATUS_CONFIG[payment.status]
  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-y-auto border-l border-slate-200">
        <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Chi tiết giao dịch</p>
              <h2 className="text-xl font-bold font-mono">{payment.transactionId || 'N/A'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.badge} bg-white/90`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
              {cfg.label}
            </span>
            <span className="text-blue-200 text-xs">{METHOD_CONFIG[payment.paymentMethod]?.label ?? payment.paymentMethod}</span>
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
            { label: 'Mã đặt phòng', value: payment.bookingCode, mono: true, accent: true },
            { label: 'Booking ID', value: `#${payment.bookingId}`, mono: true },
            { label: 'Phương thức', value: METHOD_CONFIG[payment.paymentMethod]?.label ?? payment.paymentMethod },
            { label: 'Trạng thái', value: cfg.label },
            { label: 'Ngày thanh toán', value: payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('vi-VN') : '---' },
            { label: 'Ngày tạo', value: new Date(payment.createdAt).toLocaleString('vi-VN') },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-start">
              <span className="text-xs text-slate-500 pt-0.5">{item.label}</span>
              <span className={`text-sm font-semibold text-right max-w-[60%] break-all ${item.mono ? 'font-mono' : ''} ${item.accent ? 'text-blue-600' : 'text-slate-800'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">Đóng</button>
        </div>
      </div>
    </>
  )
}

export default function AdminPaymentsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch] = useDebounce(searchInput, 400)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('') // Thêm State cho Method
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, { params: { page: 0, size: 1000 } }).then(r => r.data.content),
  })

  const owners = useMemo(() => {
    return Array.from(new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values())
  }, [hotels])

  // Cập nhật hook usePayments để truyền thêm methodFilter
  const { data: pageData, isLoading: isLoadingPayments } = usePayments(currentPage, pageSize, {
    search: debouncedSearch,
    status: statusFilter,
    method: methodFilter, // Truyền vào BE
    hotelId: selectedHotelId,
    ownerId: selectedOwnerId
  })
  const payments = pageData?.content || []

  // Stats filter (tùy chọn: có thể filter stats theo phương thức nếu muốn)
  const { data: allStatsPage } = usePayments(0, 10000, {
    hotelId: selectedHotelId,
    ownerId: selectedOwnerId,
    method: methodFilter // Filter stats theo method
  })
  const statsPayments = allStatsPage?.content || []

  const statsCounts = useMemo(() => {
    return PAYMENT_STAT_STATUSES.reduce((acc, status) => {
      acc[status] = statsPayments.filter(p => p.status === status).length
      return acc
    }, {} as Record<PaymentStatus, number>)
  }, [statsPayments])

  const handleClearFilters = () => {
    setSearchInput('')
    setStatusFilter('')
    setMethodFilter('') // Reset method
    setSelectedHotelId(null)
    setSelectedOwnerId(null)
    setCurrentPage(0)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportPayments({
        keyword: debouncedSearch || undefined,
        status: statusFilter || undefined,
        method: methodFilter || undefined, // Thêm method vào export
        hotelId: selectedHotelId || undefined,
        ownerId: selectedOwnerId || undefined,
      })
      toast.success('Xuất file thành công!')
    } catch {
      toast.error('Xuất file thất bại.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý giao dịch</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hệ thống Admin · Tổng {pageData?.totalElements || 0} giao dịch
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {PAYMENT_STAT_STATUSES.map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const isActive = statusFilter === status
          return (
            <button
              key={status}
              onClick={() => { setStatusFilter(isActive ? '' : status); setCurrentPage(0) }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-50'}`}>
                  <Icon size={16} className={config.color} />
                </div>
                <span className="text-xs font-medium text-gray-500">{config.label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{statsCounts[status] || 0}</div>
            </button>
          )
        })}
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Mã booking, mã giao dịch..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setCurrentPage(0) }}
          />
        </div>

        {/* BỘ LỌC PHƯƠNG THỨC THANH TOÁN (MỚI) */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 bg-white">
          <CreditCard size={16} className="text-gray-400" />
          <select
            className="py-2 bg-transparent text-sm outline-none min-w-[160px]"
            value={methodFilter}
            onChange={e => { setMethodFilter(e.target.value as PaymentMethod | ''); setCurrentPage(0) }}
          >
            <option value="">Tất cả phương thức</option>
            {Object.entries(METHOD_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 bg-white">
          <User size={16} className="text-gray-400" />
          <select
            className="py-2 bg-transparent text-sm outline-none min-w-[150px]"
            value={selectedOwnerId || ''}
            onChange={e => { 
              setSelectedOwnerId(Number(e.target.value) || null)
              setSelectedHotelId(null)
              setCurrentPage(0) 
            }}
          >
            <option value="">Tất cả chủ KS</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 bg-white">
          <Building2 size={16} className="text-gray-400" />
          <select
            className="py-2 bg-transparent text-sm outline-none min-w-[180px]"
            value={selectedHotelId || ''}
            onChange={e => { setSelectedHotelId(Number(e.target.value) || null); setCurrentPage(0) }}
          >
            <option value="">Tất cả khách sạn</option>
            {hotels
              .filter(h => !selectedOwnerId || h.ownerId === selectedOwnerId)
              .map(h => <option key={h.id} value={h.id}>{h.hotelName}</option>)}
          </select>
        </div>

        <button onClick={handleClearFilters} className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* HIỂN THỊ DÒNG THÔNG BÁO XUẤT FILE */}
      {(debouncedSearch || statusFilter || methodFilter || selectedHotelId || selectedOwnerId) && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          📌 File Excel sẽ được xuất theo bộ lọc đang áp dụng.
        </p>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Mã giao dịch</th>
                <th className="px-6 py-4">Mã Booking</th>
                <th className="px-6 py-4">Chủ KS / Khách sạn</th>
                <th className="px-6 py-4">Số tiền</th>
                <th className="px-6 py-4">Phương thức</th>
                <th className="px-6 py-4">Ngày thanh toán</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingPayments ? (
                <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : (
                payments.map(p => {
                  const hotel = hotels.find(h => h.id === p.hotelId)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                       <td className="px-6 py-4 font-mono text-xs text-gray-400">{p.transactionId || '---'}</td>
                      <td className="px-6 py-4 font-bold text-blue-600">{p.bookingCode}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-800">{hotel?.ownerName || '---'}</div>
                        <div className="text-xs text-gray-400">{hotel?.hotelName || ''}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{p.amount.toLocaleString('vi-VN')} ₫</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${METHOD_CONFIG[p.paymentMethod]?.dot ?? 'bg-gray-400'}`} />
                          {METHOD_CONFIG[p.paymentMethod]?.label ?? p.paymentMethod}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{p.paymentDate ? new Date(p.paymentDate).toLocaleString('vi-VN') : '---'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_CONFIG[p.status].badge}`}>
                          {STATUS_CONFIG[p.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedPayment(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
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

        {pageData && pageData.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100">
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

      <PaymentDetailDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
    </div>
  )
}