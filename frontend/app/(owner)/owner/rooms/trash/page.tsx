'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import roomApi from '@/lib/api/room.api'
import { 
  RefreshCcw, ArrowLeft, Loader2, BedDouble, 
  Search, Trash2, Calendar, Info 
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useOwnerHotel } from '../../../owner-hotel-context'

export default function RoomTrashPage() {
  const qc = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const { activeHotel, activeHotelId } = useOwnerHotel()
  
  // 1. Lấy tất cả dữ liệu phòng đã xóa của chủ sở hữu
  const { data: deletedRooms = [], isLoading } = useQuery({
    queryKey: ['rooms-deleted'], // Không nhất thiết để activeHotelId ở key nếu API trả về all, nhưng để đồng bộ logic fetch lại khi đổi ks thì có thể giữ
    queryFn: () => roomApi.getDeleted().then(r => r.data)
  })

  // 2. Lọc theo Hotel ID (Lấy ý tưởng từ trang Payment)
  const hotelDeletedRooms = useMemo(() => {
    if (!activeHotelId) return []
    return deletedRooms.filter(room => room.hotelId === activeHotelId)
  }, [deletedRooms, activeHotelId])

  // 3. Lọc theo từ khóa tìm kiếm trên danh sách của khách sạn hiện tại
  const filteredRooms = useMemo(() => {
    return hotelDeletedRooms.filter(room => 
      room.typeName.toLowerCase().includes(keyword.toLowerCase())
    )
  }, [hotelDeletedRooms, keyword])

  // 4. Mutation khôi phục
  const restoreMutation = useMutation({
    mutationFn: (id: number) => roomApi.restore(id),
    onSuccess: () => {
      toast.success('Khôi phục loại phòng thành công!')
      // Invalidate cả 2 query để cập nhật lại dữ liệu ở trang quản lý và trang thùng rác
      qc.invalidateQueries({ queryKey: ['rooms-deleted'] })
      qc.invalidateQueries({ queryKey: ['owner-rooms', activeHotelId] })
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Khôi phục thất bại')
    }
  })

  return (
    <div className="space-y-6 p-6 max-w-[1200px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/owner/rooms" 
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="text-red-500" size={24} />
              Thùng rác loại phòng
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Khách sạn: <span className="text-blue-600">{activeHotel?.hotelName || 'Đang tải...'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 text-sm">
          <Info size={16} />
          Dữ liệu sẽ được lưu trữ tại đây trước khi bị xóa vĩnh viễn
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên loại phòng trong thùng rác..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Loại phòng</th>
              <th className="px-6 py-4">Giá cơ bản</th>
              <th className="px-6 py-4">Ngày xóa</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-gray-400">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="flex flex-col items-center text-gray-300">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <BedDouble size={40} className="opacity-20" />
                    </div>
                    <p className="text-lg font-medium text-gray-400">Thùng rác trống</p>
                    <p className="text-sm">Không có loại phòng nào bị xóa cho khách sạn này</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">
                    #{room.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0 overflow-hidden border border-gray-200">
                        {room.thumbnailUrl ? (
                          <img src={room.thumbnailUrl} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                        ) : <BedDouble size={18} />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {room.typeName}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">
                          {room.hotelName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-blue-600">
                      {Number(room.basePrice).toLocaleString('vi-VN')}₫
                    </div>
                    <div className="text-[10px] text-gray-400">mỗi đêm</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {room.deletedAt 
                        ? new Date(room.deletedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          }) 
                        : '---'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        if(confirm(`Khôi phục loại phòng "${room.typeName}"?`)) {
                          restoreMutation.mutate(room.id)
                        }
                      }}
                      disabled={restoreMutation.isPending}
                      className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                      <RefreshCcw 
                        size={14} 
                        className={restoreMutation.isPending ? 'animate-spin' : ''} 
                      />
                      KHÔI PHỤC
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer info */}
        {!isLoading && filteredRooms.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
            <span>Hiển thị {filteredRooms.length} loại phòng thuộc {activeHotel?.hotelName}</span>
            <span>ID Khách sạn: {activeHotelId}</span>
          </div>
        )}
      </div>
    </div>
  )
}