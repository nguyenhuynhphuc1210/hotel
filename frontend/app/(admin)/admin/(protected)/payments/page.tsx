'use client'

import { useState, useMemo } from 'react'
import { usePayments } from '@/hooks/usePayment'
// Import types
import { PaymentStatus, PaymentMethod, PaymentResponse } from '@/types/payment.types'
import { 
  Search, CreditCard, CheckCircle2, 
  Download, Eye, Loader2
} from 'lucide-react'
import Pagination from '@/components/ui/Pagination'

export default function AdminPaymentsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')

  const { data: pageData, isLoading } = usePayments(currentPage, pageSize)
  const payments = pageData?.content || []

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
      PAID:      'bg-green-50 text-green-700 border-green-100',
      PENDING:   'bg-amber-50 text-amber-700 border-amber-100',
      UNPAID:    'bg-blue-50 text-blue-700 border-blue-100',
      FAILED:    'bg-red-50 text-red-700 border-red-100',
      CANCELLED: 'bg-gray-50 text-gray-700 border-gray-100',
      REFUNDED:  'bg-purple-50 text-purple-700 border-purple-100',
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
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${p.paymentMethod === 'VNPAY' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                    {p.paymentMethod}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleString('vi-VN') : '---'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
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
    </div>
  )
}