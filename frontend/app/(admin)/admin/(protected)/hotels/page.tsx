'use client'

import { useState } from 'react'
import { 
  useHotels, 
  useApproveHotel, 
  useDisableHotel, 
  useDeleteHotel, 
  useRejectHotel 
} from '@/hooks/useHotel'
import { HotelResponse, HotelStatus } from '@/lib/api/hotel.api'
import {
  Search, Plus, Pencil, Trash2, CheckCircle,
  XCircle, ShieldCheck, ShieldOff, Star, 
  Loader2, Ban, RotateCcw, AlertTriangle
} from 'lucide-react'
import HotelFormModal from '@/components/admin/hotel/HotelFormModal'
import Pagination from '@/components/ui/Pagination'

export default function AdminHotelsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<HotelStatus | ''>('')
  const [openForm, setOpenForm] = useState(false)
  const [editingHotel, setEditingHotel] = useState<HotelResponse | null>(null)

  // 1. Lấy dữ liệu từ Hook
  const { data: pageData, isLoading } = useHotels(currentPage, pageSize)
  const hotels = pageData?.content || []

  // 2. Mutations
  const deleteMutation = useDeleteHotel()
  const approveMutation = useApproveHotel()
  const rejectMutation = useRejectHotel()
  const disableMutation = useDisableHotel()

  // 3. Logic xử lý hành động
  const handleDelete = (h: HotelResponse) => {
    if (confirm(`Chuyển khách sạn "${h.hotelName}" vào thùng rác?`)) {
      deleteMutation.mutate(h.id)
    }
  }

  const handleApprove = (h: HotelResponse) => {
    if (confirm(`Duyệt khách sạn "${h.hotelName}" hoạt động?`)) {
      approveMutation.mutate(h.id)
    }
  }

  const handleReject = (h: HotelResponse) => {
    const reason = prompt(`Lý do từ chối khách sạn "${h.hotelName}":`)
    if (reason === null) return // Người dùng nhấn Cancel
    if (!reason.trim()) return alert("Vui lòng nhập lý do từ chối!")
    
    rejectMutation.mutate({ id: h.id, reason })
  }

  const handleDisable = (h: HotelResponse) => {
    const reason = prompt(`Lý do vô hiệu hóa khách sạn "${h.hotelName}":`)
    if (reason === null) return 
    if (!reason.trim()) return alert("Vui lòng nhập lý do vô hiệu hóa!")

    disableMutation.mutate({ id: h.id, reason })
  }

  const handleEdit = (h: HotelResponse) => {
    setEditingHotel(h)
    setOpenForm(true)
  }

  // 4. Lọc dữ liệu trên trang hiện tại
  const filtered = hotels.filter(h => {
    const matchKeyword =
      h.hotelName.toLowerCase().includes(keyword.toLowerCase()) ||
      h.email.toLowerCase().includes(keyword.toLowerCase()) ||
      h.district.toLowerCase().includes(keyword.toLowerCase())
    
    const matchStatus = statusFilter === '' ? true : h.status === statusFilter
    
    return matchKeyword && matchStatus
  })

  // 5. Thống kê
  const totalPending = hotels.filter(h => h.status === HotelStatus.PENDING).length
  const totalApproved = hotels.filter(h => h.status === HotelStatus.APPROVED).length

  // Helper render Badge trạng thái
  const renderStatusBadge = (status: HotelStatus) => {
    const configs = {
      [HotelStatus.PENDING]: { color: 'text-amber-700 bg-amber-50', label: 'Chờ duyệt', icon: <XCircle size={12} /> },
      [HotelStatus.APPROVED]: { color: 'text-green-700 bg-green-50', label: 'Hoạt động', icon: <CheckCircle size={12} /> },
      [HotelStatus.REJECTED]: { color: 'text-red-700 bg-red-50', label: 'Bị từ chối', icon: <Ban size={12} /> },
      [HotelStatus.DISABLED]: { color: 'text-gray-700 bg-gray-100', label: 'Bị khóa', icon: <ShieldOff size={12} /> },
      [HotelStatus.SUSPENDED]: { color: 'text-blue-700 bg-blue-50', label: 'Tạm ngưng', icon: <RotateCcw size={12} /> },
    }
    const config = configs[status]
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý khách sạn</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hiển thị {filtered.length} / {pageData?.totalElements || 0} khách sạn
          </p>
        </div>
        <button
          onClick={() => { setEditingHotel(null); setOpenForm(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Thêm khách sạn
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Tổng hệ thống</span>
          <span className="text-lg font-bold px-2.5 py-0.5 rounded-lg text-gray-700 bg-gray-100">
            {pageData?.totalElements || 0}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Trang này (Hoạt động)</span>
          <span className="text-lg font-bold px-2.5 py-0.5 rounded-lg text-green-700 bg-green-50">
            {totalApproved}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Trang này (Chờ duyệt)</span>
          <span className="text-lg font-bold px-2.5 py-0.5 rounded-lg text-amber-700 bg-amber-50">
            {totalPending}
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm trên trang này..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as HotelStatus | ''); setCurrentPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value={HotelStatus.APPROVED}>Hoạt động</option>
          <option value={HotelStatus.PENDING}>Chờ duyệt</option>
          <option value={HotelStatus.REJECTED}>Bị từ chối</option>
          <option value={HotelStatus.DISABLED}>Đã khóa</option>
          <option value={HotelStatus.SUSPENDED}>Tạm ngưng</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Khách sạn</th>
              <th className="text-left px-4 py-3">Địa chỉ</th>
              <th className="text-left px-4 py-3">Liên hệ</th>
              <th className="text-left px-4 py-3 text-center">Sao</th>
              <th className="text-left px-4 py-3">Chủ sở hữu</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không tìm thấy khách sạn nào</td></tr>
            ) : (
              filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{h.hotelName}</div>
                    <div className="text-xs text-gray-400">#{h.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{h.district}</div>
                    <div className="text-xs text-gray-400">{h.ward}, {h.city}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{h.email}</div>
                    <div className="text-xs text-gray-400">{h.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-500">
                      <Star size={13} fill="currentColor" />
                      <span className="text-sm text-gray-700">{h.starRating ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{h.ownerName}</div>
                    <div className="text-xs text-gray-400">ID: {h.ownerId}</div>
                  </td>
                  <td className="px-4 py-3">
                    {renderStatusBadge(h.status)}
                    {h.statusReason && (
                       <div className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1 italic max-w-[120px] truncate" title={h.statusReason}>
                          <AlertTriangle size={10} /> {h.statusReason}
                       </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Nút sửa */}
                      <button onClick={() => handleEdit(h)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                        <Pencil size={15} />
                      </button>

                      {/* Nút Duyệt / Từ chối (Chỉ cho PENDING) */}
                      {h.status === HotelStatus.PENDING && (
                        <>
                          <button onClick={() => handleApprove(h)} title="Duyệt" className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50">
                            <ShieldCheck size={15} />
                          </button>
                          <button onClick={() => handleReject(h)} title="Từ chối" className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50">
                            <Ban size={15} />
                          </button>
                        </>
                      )}

                      {/* Nút Khóa (Chỉ cho APPROVED) */}
                      {h.status === HotelStatus.APPROVED && (
                        <button onClick={() => handleDisable(h)} title="Vô hiệu hóa" className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50">
                          <ShieldOff size={15} />
                        </button>
                      )}

                      {/* Nút Kích hoạt lại (Cho DISABLED hoặc REJECTED) */}
                      {(h.status === HotelStatus.DISABLED || h.status === HotelStatus.REJECTED) && (
                        <button onClick={() => handleApprove(h)} title="Kích hoạt lại" className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50">
                          <RotateCcw size={15} />
                        </button>
                      )}

                      {/* Nút Xóa (Mềm) */}
                      <button onClick={() => handleDelete(h)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Phân trang */}
        {pageData && pageData.totalPages > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
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

      <HotelFormModal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditingHotel(null); }}
        hotel={editingHotel}
      />
    </div>
  )
}