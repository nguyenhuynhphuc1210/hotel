'use client'

import { useState } from 'react'
import { useDeletedHotels, useRestoreHotel } from '@/hooks/useHotel'
import { RefreshCcw, ArrowLeft, Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'

export default function HotelTrashPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useDeletedHotels(page, 5)
  const restoreMutation = useRestoreHotel()

  const handleRestore = (id: number, name: string) => {
    if (confirm(`Bạn có chắc muốn khôi phục khách sạn "${name}"?`)) {
      restoreMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Link href="/admin/hotels" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thùng rác khách sạn</h1>
          <p className="text-sm text-gray-500">Danh sách các khách sạn đã thực hiện xóa mềm</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Tên khách sạn</th>
              <th className="px-4 py-3">Địa chỉ</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
            ) : data?.content.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-gray-400">Thùng rác trống</td></tr>
            ) : (
              data?.content.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">#{h.id}</td>
                  <td className="px-4 py-3 font-medium">{h.hotelName}</td>
                  <td className="px-4 py-3 text-gray-500">{h.city}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(h.id, h.hotelName)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCcw size={14} /> Khôi phục
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {data && (
          <div className="p-4 border-t">
            <Pagination 
              currentPage={page} 
              totalPages={data.totalPages} 
              onPageChange={setPage} 
              pageSize={5} 
              totalElements={data.totalElements}
            />
          </div>
        )}
      </div>
    </div>
  )
}