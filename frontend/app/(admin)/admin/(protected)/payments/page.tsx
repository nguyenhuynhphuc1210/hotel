'use client'

import { useState, useMemo, useEffect } from 'react'
import { usePayments } from '@/hooks/usePayment'
import { PaymentStatus, PaymentResponse } from '@/types/payment.types'
import { useHotelStatistics } from '@/hooks/useStatistic'
import {
  Search,
  CreditCard,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  XCircle,
  RotateCcw,
  Calendar,
  Building2,
  TrendingUp,
} from 'lucide-react'

import Pagination from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelResponse } from '@/lib/api/hotel.api'

// --- CONFIGS (Giữ nguyên) ---
const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; badge: string }> = {
  PAID: { label: 'Đã thanh toán', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  PENDING: { label: 'Chờ xử lý', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  UNPAID: { label: 'Chưa thanh toán', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' },
  FAILED: { label: 'Thất bại', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200' },
  REFUNDED: { label: 'Hoàn tiền', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
}

const METHOD_CONFIG: Record<string, { label: string; dot: string }> = {
  VNPAY: { label: 'VNPay', dot: 'bg-blue-500' },
  MOMO: { label: 'MoMo', dot: 'bg-pink-500' },
  ZALOPAY: { label: 'ZaloPay', dot: 'bg-cyan-500' },
  CREDIT_CARD: { label: 'Thẻ tín dụng', dot: 'bg-indigo-500' },
  BANK_TRANSFER: { label: 'Chuyển khoản', dot: 'bg-teal-500' },
  CASH: { label: 'Tiền mặt', dot: 'bg-orange-500' },
}

// --- Detail Drawer (Giữ nguyên) ---
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
              <XCircle size={20} />
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

// --- Main Component ---
export default function AdminPaymentsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null)

  // Filter theo khách sạn và ngày
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: ''
  })

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Lấy danh sách khách sạn cho dropdown
  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, { params: { page: 0, size: 1000 } }).then(r => r.data.content),
  })

  // 1. Lấy thống kê (Cho các thẻ Card)
  const { data: statsData, isLoading: isLoadingStats } = useHotelStatistics({
    hotelId: selectedHotelId as number,
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate
  }, !!selectedHotelId)

  // 2. Lấy danh sách giao dịch (Table)
  // Lưu ý: Nếu Backend hỗ trợ param hotelId, hãy bổ sung vào usePayments
  const { data: pageData, isLoading: isLoadingPayments } = usePayments(currentPage, pageSize, search, statusFilter)
  const payments = pageData?.content || []

  // 3. Logic "Scale" Thống kê
  const displayStats = useMemo(() => {
    // Nếu ĐÃ CHỌN khách sạn -> Lấy số liệu từ API Thống kê (Chính xác 100% cho khách sạn đó)
    if (selectedHotelId && statsData) {
      return {
        total: statsData.reduce((sum, item) => sum + (item.grossBookings || 0), 0),
        paidCount: statsData.reduce((sum, item) => sum + (item.totalBookings || 0), 0),
        revenue: statsData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
        isScaled: true
      }
    }

    // Nếu CHƯA CHỌN khách sạn -> Tính dựa trên dữ liệu thanh toán đang hiển thị
    const paidPayments = payments.filter(p => p.status === 'PAID')
    return {
      total: pageData?.totalElements || 0,
      paidCount: paidPayments.length,
      revenue: paidPayments.reduce((sum, p) => sum + p.amount, 0),
      isScaled: false
    }
  }, [pageData, payments, selectedHotelId, statsData])

  // 4. Logic "Scale" Table (Lọc giao dịch của khách sạn đã chọn)
  const filteredPayments = useMemo(() => {
    if (!selectedHotelId) return payments
    return payments.filter(p => p.hotelId === selectedHotelId)
  }, [payments, selectedHotelId])

  const handleClearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setSelectedHotelId(null)
    setDateRange({ fromDate: '', toDate: '' })
    setCurrentPage(0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý giao dịch</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelId
              ? `Đang xem dữ liệu của: ${hotels.find(h => h.id === selectedHotelId)?.hotelName}`
              : 'Theo dõi dòng tiền và doanh thu hệ thống'}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={16} /> Xuất CSV
        </button>
      </div>

      {/* Stats Cards (Scaled) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Tổng lượt đặt</span>
            <CreditCard size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{displayStats.total}</div>
          {displayStats.isScaled && <div className="absolute bottom-0 left-0 h-1 w-full bg-blue-500" />}
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Thành công (PAID)</span>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {displayStats.paidCount}
            <small className="text-xs text-gray-400 font-normal ml-1">mục</small>
          </div>
          {displayStats.isScaled && <div className="absolute bottom-0 left-0 h-1 w-full bg-green-500" />}
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Doanh thu thống kê</span>
            <TrendingUp size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">
            {isLoadingStats ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              `${displayStats.revenue.toLocaleString('vi-VN')} ₫`
            )}
          </div>
          {displayStats.isScaled && <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-500" />}
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã booking..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setCurrentPage(0); }}
          />
        </div>

        {/* Scaler: Hotel Selector */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 bg-blue-50/50 border-blue-100">
          <Building2 size={16} className="text-blue-500 ml-1" />
          <select
            className="py-2 bg-transparent text-sm outline-none min-w-[180px] font-medium text-blue-700"
            value={selectedHotelId || ''}
            onChange={e => {
              setSelectedHotelId(Number(e.target.value) || null);
              setCurrentPage(0);
            }}
          >
            <option value="">Tất cả khách sạn</option>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.hotelName}</option>)}
          </select>
        </div>

        {/* Scaler: Date Range */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 bg-gray-50/50">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            className="bg-transparent text-sm outline-none py-1"
            value={dateRange.fromDate}
            onChange={e => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
          />
          <span className="text-gray-300">-</span>
          <input
            type="date"
            className="bg-transparent text-sm outline-none py-1"
            value={dateRange.toDate}
            onChange={e => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
          />
        </div>

        <select
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as PaymentStatus | ''); setCurrentPage(0); }}
        >
          <option value="">Trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>

        <button
          onClick={handleClearFilters}
          className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-all"
          title="Xóa lọc"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Table Section */}
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
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-gray-400 font-medium">Không có dữ liệu giao dịch trong mục này</td></tr>
              ) : (
                filteredPayments.map(p => {
                  const hotel = hotels.find(h => h.id === p.hotelId)
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400 group-hover:text-gray-600">{p.transactionId || '---'}</td>
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

        {/* Pagination */}
        {pageData && pageData.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/30">
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