'use client'

import { useState } from 'react'
import { useHotels, useDeleteHotel, useApproveHotel, useDisableHotel } from '@/hooks/useHotel'
import { HotelResponse } from '@/lib/api/hotel.api'
import {
  Search, Plus, Pencil, Trash2, CheckCircle,
  XCircle, ShieldCheck, ShieldOff, Star, Filter
} from 'lucide-react'
import HotelFormModal from '@/components/admin/hotel/HotelFormModal'

export default function AdminHotelsPage() {
  const { data: hotels = [], isLoading } = useHotels()
  const deleteMutation  = useDeleteHotel()
  const approveMutation = useApproveHotel()
  const disableMutation = useDisableHotel()

  const [keyword, setKeyword]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openForm, setOpenForm]       = useState(false)
  const [editingHotel, setEditingHotel] = useState<HotelResponse | null>(null)

  // Filter
  const filtered = hotels.filter(h => {
    const matchKeyword =
      h.hotelName.toLowerCase().includes(keyword.toLowerCase()) ||
      h.email.toLowerCase().includes(keyword.toLowerCase()) ||
      h.district.toLowerCase().includes(keyword.toLowerCase())
    const matchStatus =
      statusFilter === 'active'   ? h.isActive :
      statusFilter === 'inactive' ? !h.isActive : true
    return matchKeyword && matchStatus
  })

  // Thống kê
  const totalActive   = hotels.filter(h => h.isActive).length
  const totalInactive = hotels.filter(h => !h.isActive).length

  const handleDelete = (h: HotelResponse) => {
    if (confirm(`Xoá khách sạn "${h.hotelName}"? Hành động này không thể hoàn tác.`)) {
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

  const handleCloseForm = () => {
    setOpenForm(false)
    setEditingHotel(null)
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý khách sạn</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng: {hotels.length} khách sạn</p>
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
        {[
          { label: 'Tổng',         value: hotels.length,  color: 'text-gray-700 bg-gray-100' },
          { label: 'Hoạt động',    value: totalActive,    color: 'text-green-700 bg-green-50' },
          { label: 'Chờ duyệt',    value: totalInactive,  color: 'text-amber-700 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{s.label}</span>
            <span className={`text-lg font-bold px-2.5 py-0.5 rounded-lg ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên, email, quận..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

            {isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
            )}

            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không tìm thấy khách sạn nào</td></tr>
            )}

            {filtered.map(h => (
              <tr key={h.id} className={`hover:bg-gray-50 transition-colors ${!h.isActive ? 'opacity-70' : ''}`}>

                {/* Tên */}
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{h.hotelName}</div>
                  <div className="text-xs text-gray-400">#{h.id}</div>
                </td>

                {/* Địa chỉ */}
                <td className="px-4 py-3 text-gray-600">
                  <div>{h.district}</div>
                  <div className="text-xs text-gray-400">{h.ward}</div>
                </td>

                {/* Liên hệ */}
                <td className="px-4 py-3">
                  <div className="text-gray-700">{h.email}</div>
                  <div className="text-xs text-gray-400">{h.phone}</div>
                </td>

                {/* Sao */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={13} fill="currentColor" />
                    <span className="text-sm text-gray-700">{h.starRating ?? 0}</span>
                  </div>
                </td>

                {/* Chủ */}
                <td className="px-4 py-3">
                  <div className="text-gray-700">{h.ownerName}</div>
                  <div className="text-xs text-gray-400">ID: {h.ownerId}</div>
                </td>

                {/* Trạng thái */}
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

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">

                    {/* Sửa */}
                    <button
                      onClick={() => handleEdit(h)}
                      title="Sửa"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>

                    {/* Duyệt / Vô hiệu */}
                    {!h.isActive ? (
                      <button
                        onClick={() => handleApprove(h)}
                        disabled={approveMutation.isPending}
                        title="Duyệt khách sạn"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <ShieldCheck size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisable(h)}
                        disabled={disableMutation.isPending}
                        title="Vô hiệu hoá"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <ShieldOff size={15} />
                      </button>
                    )}

                    {/* Xoá */}
                    <button
                      onClick={() => handleDelete(h)}
                      disabled={deleteMutation.isPending}
                      title="Xoá"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <HotelFormModal
        open={openForm}
        onClose={handleCloseForm}
        hotel={editingHotel}
      />

    </div>
  )
}