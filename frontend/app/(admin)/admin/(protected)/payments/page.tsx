'use client'

import { useState, useMemo } from 'react'
import { usePayments } from '@/hooks/usePayment'
// Import types
import { PaymentStatus, PaymentMethod, PaymentResponse } from '@/types/payment.types'
import {
  Search, CreditCard, CheckCircle2,
  Download, Eye, Loader2,
  XCircle
} from 'lucide-react'
import Pagination from '@/components/ui/Pagination'

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

function PaymentDetailDrawer({ payment, onClose }: { payment: PaymentResponse | null; onClose: () => void }) {
  if (!payment) return null
  const cfg = STATUS_CONFIG[payment.status]
  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
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
            <span className="text-blue-200 text-xs">
              {METHOD_CONFIG[payment.paymentMethod]?.label ?? payment.paymentMethod}
            </span>
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
            { label: 'Booking ID', value: `#${payment.bookingId}`, mono: true, accent: false },
            { label: 'Phương thức', value: METHOD_CONFIG[payment.paymentMethod]?.label ?? payment.paymentMethod, mono: false, accent: false },
            { label: 'Trạng thái', value: cfg.label, mono: false, accent: false },
            { label: 'Ngày thanh toán', value: payment.paymentDate ? new Date(payment.paymentDate).toLocaleString('vi-VN') : '---', mono: false, accent: false },
            { label: 'Ngày tạo', value: new Date(payment.createdAt).toLocaleString('vi-VN'), mono: false, accent: false },
            { label: 'Cập nhật lần cuối', value: new Date(payment.updatedAt).toLocaleString('vi-VN'), mono: false, accent: false },
          ].map(({ label, value, mono, accent }) => (
            <div key={label} className="flex justify-between items-start">
              <span className="text-xs text-slate-500 pt-0.5">{label}</span>
              <span className={`text-sm font-semibold text-right max-w-[60%] break-all ${mono ? 'font-mono' : ''} ${accent ? 'text-blue-600' : 'text-slate-800'}`}>
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

export default function AdminPaymentsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')

  const { data: pageData, isLoading } = usePayments(currentPage, pageSize)
  const payments = pageData?.content || []
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null)

  // ── 1. Thống kê nhanh ──
  const stats = useMemo(() => {
    if (!pageData) return { total: 0, paid: 0, revenue: 0 }
    return {
      total: pageData.totalElements,
      // Sửa SUCCESS thành PAID theo type của bạn
      paid: payments.filter(p => p.status === 'PAID').length,
      revenue: payments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
    }
  }, [pageData, payments])

  // ── 2. Filter ──
  const filteredPayments = payments.filter(p => {
    const matchSearch =
      (p.bookingCode?.toLowerCase().includes(search.toLowerCase())) ||
      (p.transactionId?.toLowerCase().includes(search.toLowerCase()))

    const matchStatus = statusFilter === '' ? true : p.status === statusFilter
    return matchSearch && matchStatus
  })

  // Helper render Badge (Sửa lại các key cho khớp với type mới)
  const getStatusStyle = (status: PaymentStatus) => {
    const styles: Record<PaymentStatus, string> = {
      PAID: 'bg-green-50 text-green-700 border-green-100',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
      UNPAID: 'bg-blue-50 text-blue-700 border-blue-100',
      FAILED: 'bg-red-50 text-red-700 border-red-100',
      CANCELLED: 'bg-gray-50 text-gray-700 border-gray-100',
      REFUNDED: 'bg-purple-50 text-purple-700 border-purple-100',
    }
    return styles[status] || 'bg-gray-50 text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats tương tự như cũ, chỉ thay đổi label */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý giao dịch</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi dòng tiền hệ thống</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download size={16} /> Xuất CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Tổng giao dịch</span>
            <CreditCard size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{pageData?.totalElements || 0}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Đã thanh toán</span>
            <CheckCircle2 size={18} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.paid} <small className="text-xs text-gray-400 font-normal">mục</small></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Doanh thu</span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">VND</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.revenue.toLocaleString('vi-VN')} ₫</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đặt phòng hoặc mã giao dịch..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="UNPAID">Chưa thanh toán</option>
          <option value="FAILED">Thất bại</option>
          <option value="CANCELLED">Đã hủy</option>
          <option value="REFUNDED">Đã hoàn tiền</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Mã giao dịch</th>
                <th className="px-6 py-4">Mã Booking</th>
                <th className="px-6 py-4">Số tiền</th>
                <th className="px-6 py-4">Phương thức</th>
                <th className="px-6 py-4">Ngày thanh toán</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.transactionId || '---'}</td>
                  <td className="px-6 py-4 font-bold text-blue-600">{p.bookingCode}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{p.amount.toLocaleString('vi-VN')} ₫</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${METHOD_CONFIG[p.paymentMethod]?.dot ?? 'bg-gray-400'}`} />
                    {METHOD_CONFIG[p.paymentMethod]?.label ?? p.paymentMethod}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleString('vi-VN') : '---'}
                  </td>
                  <td className="px-6 py-4">
                    {/* Lấy config dựa trên key p.status */}
                    {STATUS_CONFIG[p.status] ? (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[p.status].badge}`}>
                        {STATUS_CONFIG[p.status].label}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-gray-50 text-gray-600">
                        {p.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedPayment(p)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageData && (
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