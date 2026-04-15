'use client'

import { useState } from 'react'
import { useHotels, useDeleteHotel, useApproveHotel, useDisableHotel } from '@/hooks/useHotel'
import { HotelResponse } from '@/lib/api/hotel.api'
import {
  Search, Plus, Pencil, Trash2, CheckCircle,
  XCircle, ShieldCheck, ShieldOff, Star, Filter,
  Loader2
} from 'lucide-react'
import HotelFormModal from '@/components/admin/hotel/HotelFormModal'
import Pagination from '@/components/ui/Pagination'

export default function AdminHotelsPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(5)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [editingHotel, setEditingHotel] = useState<HotelResponse | null>(null)

  // 1. Lấy dữ liệu theo trang và size
  const { data: pageData, isLoading } = useHotels(currentPage, pageSize)

  // 2. Trích xuất mảng hotels từ content
  const hotels = pageData?.content || []

  const deleteMutation = useDeleteHotel()
  const approveMutation = useApproveHotel()
  const disableMutation = useDisableHotel()

  // 3. Filter (Lưu ý: Với phân trang, filter này chỉ tác động trên dữ liệu của trang hiện tại)
  const filtered = hotels.filter(h => {
    const matchKeyword =
      h.hotelName.toLowerCase().includes(keyword.toLowerCase()) ||
      h.email.toLowerCase().includes(keyword.toLowerCase()) ||
      h.district.toLowerCase().includes(keyword.toLowerCase())
    const matchStatus =
      statusFilter === 'active' ? h.isActive :
        statusFilter === 'inactive' ? !h.isActive : true
    return matchKeyword && matchStatus
  })

  // Thống kê (Dựa trên trang hiện tại hoặc dùng pageData.totalElements nếu muốn tổng hệ thống)
  const totalActive = hotels.filter(h => h.isActive).length
  const totalInactive = hotels.filter(h => !h.isActive).length

  const handleDelete = (h: HotelResponse) => {
    if (confirm(`Xoá khách sạn "${h.hotelName}"?`)) {
      deleteMutation.mutate(h.id)
    }
  }

  const handleApprove = (h: HotelResponse) => {
    if (confirm(`Duyệt khách sạn "${h.hotelName}"?`)) {
      approveMutation.mutate(h.id)
    }
  }

  const handleDisable = (h: HotelResponse) => {
    if (confirm(`Vô hiệu hoá khách sạn "${h.hotelName}"?`)) {
      disableMutation.mutate(h.id)
    }
  }

  const handleEdit = (h: HotelResponse) => {
    setEditingHotel(h)
    setOpenForm(true)
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
            {totalActive}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Trang này (Chờ duyệt)</span>
          <span className="text-lg font-bold px-2.5 py-0.5 rounded-lg text-amber-700 bg-amber-50">
            {totalInactive}
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
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Chờ duyệt</option>
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
              <th className="text-left px-4 py-3">Sao</th>
              <th className="text-left px-4 py-3">Chủ sở hữu</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không tìm thấy khách sạn nào</td></tr>
            ) : (
              filtered.map(h => (
                <tr key={h.id} className={`hover:bg-gray-50 transition-colors ${!h.isActive ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{h.hotelName}</div>
                    <div className="text-xs text-gray-400">#{h.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{h.district}</div>
                    <div className="text-xs text-gray-400">{h.ward}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{h.email}</div>
                    <div className="text-xs text-gray-400">{h.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={13} fill="currentColor" />
                      <span className="text-sm text-gray-700">{h.starRating ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{h.ownerName}</div>
                    <div className="text-xs text-gray-400">ID: {h.ownerId}</div>
                  </td>
                  <td className="px-4 py-3">
                    {h.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle size={11} /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        <XCircle size={11} /> Chờ duyệt
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(h)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                        <Pencil size={15} />
                      </button>
                      {!h.isActive ? (
                        <button onClick={() => handleApprove(h)} className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50">
                          <ShieldCheck size={15} />
                        </button>
                      ) : (
                        <button onClick={() => handleDisable(h)} className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50">
                          <ShieldOff size={15} />
                        </button>
                      )}
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

        {/* 4. Component Phân trang */}
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

      {/* Modal */}
      <HotelFormModal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditingHotel(null); }}
        hotel={editingHotel}
      />

    </div>
  )
}