'use client'

import { useState } from 'react'
import { useDeletedHotels, useRestoreHotel } from '@/hooks/useHotel'
import { HotelResponse, HotelStatus } from '@/lib/api/hotel.api'
import { 
  RefreshCcw, 
  ArrowLeft, 
  Loader2, 
  Search, 
  Trash2, 
  Calendar, 
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  ShieldOff,
  Ban,
  RotateCcw
} from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'

export default function HotelTrashPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [keyword, setKeyword] = useState('')

  // 1. Lấy dữ liệu khách sạn đã xóa từ Hook
  const { data: pageData, isLoading } = useDeletedHotels(currentPage, pageSize)
  const restoreMutation = useRestoreHotel()

  const hotels = pageData?.content || []

  // 2. Logic lọc tìm kiếm tại chỗ (Local Filter)
  const filteredHotels = hotels.filter(h => 
    h.hotelName.toLowerCase().includes(keyword.toLowerCase()) ||
    h.email.toLowerCase().includes(keyword.toLowerCase())
  )

  const handleRestore = (id: number, name: string) => {
    if (confirm(`Bạn có chắc muốn khôi phục khách sạn "${name}" về danh sách quản lý?`)) {
      restoreMutation.mutate(id)
    }
  }

  // Helper hiển thị badge trạng thái (để biết trước khi xóa nó đang ở trạng thái nào)
  const renderStatusBadge = (status: HotelStatus) => {
    const configs = {
      [HotelStatus.PENDING]: { color: 'text-amber-600 bg-amber-50', label: 'Chờ duyệt', icon: <XCircle size={10} /> },
      [HotelStatus.APPROVED]: { color: 'text-green-600 bg-green-50', label: 'Hoạt động', icon: <CheckCircle size={10} /> },
      [HotelStatus.REJECTED]: { color: 'text-red-600 bg-red-50', label: 'Bị từ chối', icon: <Ban size={10} /> },
      [HotelStatus.DISABLED]: { color: 'text-gray-600 bg-gray-100', label: 'Đã khóa', icon: <ShieldOff size={10} /> },
      [HotelStatus.SUSPENDED]: { color: 'text-blue-600 bg-blue-50', label: 'Tạm ngưng', icon: <RotateCcw size={10} /> },
    }
    const config = configs[status]
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/hotels" 
            className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600 hover:text-blue-600"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="text-red-500" size={24} />
              Thùng rác khách sạn
            </h1>            
          </div>
        </div>
        
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
          Tổng cộng: {pageData?.totalElements || 0} mục
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên khách sạn trong thùng rác..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
            <tr>
              <th className="px-6 py-4">Khách sạn</th>
              <th className="px-6 py-4">Địa điểm</th>
              <th className="px-6 py-4">Ngày xóa</th>
              <th className="px-6 py-4">Trạng thái cũ</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-gray-500 font-medium">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : filteredHotels.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <AlertCircle size={48} className="opacity-20" />
                    <p className="text-lg font-medium">Thùng rác đang trống</p>
                    <Link href="/admin/hotels" className="text-blue-500 hover:underline text-sm">Quay lại danh sách chính</Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredHotels.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{h.hotelName}</div>
                    <div className="text-xs text-gray-400 italic">{h.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{h.city}</span>
                    </div>
                    <div className="text-xs text-gray-400 ml-5">{h.district}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} className="text-gray-400" />
                      <span>
                        {h.deletedAt 
                          ? new Date(h.deletedAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) 
                          : '---'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(h.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRestore(h.id, h.hotelName)}
                      disabled={restoreMutation.isPending}
                      className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                      {restoreMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCcw size={14} />
                      )}
                      KHÔI PHỤC
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination Container */}
        {pageData && pageData.totalPages > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <Pagination 
              currentPage={currentPage} 
              totalPages={pageData.totalPages} 
              onPageChange={setCurrentPage} 
              pageSize={pageSize} 
              totalElements={pageData.totalElements}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  )
}