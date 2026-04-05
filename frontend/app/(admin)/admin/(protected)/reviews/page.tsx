'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star, Search, MessageSquare, Eye, EyeOff, Loader2, FilterX } from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { ReviewResponse } from '@/types/review.types'
import { HotelResponse } from '@/lib/api/hotel.api'
import { useToggleReviewVisibility } from '@/hooks/useReviews' 

export default function AdminReviewsPage() {
  const [keyword, setKeyword] = useState('')
  const [starFilter, setStarFilter] = useState<number | null>(null)
  const [ownerFilter, setOwnerFilter] = useState('')
  const [hotelFilter, setHotelFilter] = useState<number | ''>('')

  const toggleVisibility = useToggleReviewVisibility()

  // 1. Lấy danh sách khách sạn để làm bộ lọc
  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS).then(r => r.data),
  })

  // 2. Lấy danh sách đánh giá (Nếu chưa chọn HotelId, có thể lấy mặc định hoặc yêu cầu chọn)
  const { data: reviewData, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['admin-reviews', hotelFilter],
    queryFn: () => {
        if (!hotelFilter) return { content: [], totalElements: 0 }
        return axiosInstance
            .get<{ content: ReviewResponse[] }>(`/api/reviews/hotel/${hotelFilter}/admin`, {
                params: { page: 0, size: 100 }
            })
            .then(r => r.data)
    },
    enabled: !!hotelFilter,
  })

  const allReviews = reviewData?.content || []

  // Xử lý bộ lọc cho UI
  const owners = Array.from(
    new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values()
  )

  const filtered = allReviews.filter((rv: ReviewResponse) => {
    const matchKeyword = !keyword ||
      rv.userName.toLowerCase().includes(keyword.toLowerCase()) ||
      (rv.comment ?? '').toLowerCase().includes(keyword.toLowerCase())
    const matchStar = starFilter === null || Math.floor(Number(rv.rating)) === starFilter
    return matchKeyword && matchStar
  })

  // Thống kê
  const avgRating = allReviews.length
    ? (allReviews.reduce((s, r) => s + Number(r.rating), 0) / allReviews.length).toFixed(1)
    : '0'

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: allReviews.filter(r => Math.floor(Number(r.rating)) === s).length,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá</h1>
        <p className="text-sm text-gray-500 mt-1">Hệ thống Admin · Kiểm duyệt và theo dõi phản hồi khách hàng</p>
      </div>

      {/* Filter Bar (Giống Admin Booking) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm theo tên khách, nội dung đánh giá..."
            value={keyword} 
            onChange={e => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <select
          value={ownerFilter}
          onChange={e => { setOwnerFilter(e.target.value); setHotelFilter('') }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[160px]"
        >
          <option value="">Tất cả chủ sở hữu</option>
          {owners.map(o => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
        </select>

        <select
          value={hotelFilter}
          onChange={e => setHotelFilter(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]"
        >
          <option value="">Chọn khách sạn để xem</option>
          {(ownerFilter ? hotels.filter(h => String(h.ownerId) === ownerFilter) : hotels).map(h => (
            <option key={h.id} value={h.id}>{h.hotelName}</option>
          ))}
        </select>

        {(keyword || starFilter || hotelFilter || ownerFilter) && (
          <button
            onClick={() => { setKeyword(''); setStarFilter(null); setHotelFilter(''); setOwnerFilter('') }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Xoá bộ lọc"
          >
            <FilterX size={20} />
          </button>
        )}
      </div>

      {!hotelFilter ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <MessageSquare size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Vui lòng chọn một khách sạn để xem danh sách đánh giá</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Cột trái: Thống kê nhanh */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="text-center mb-6">
                <div className="text-5xl font-extrabold text-gray-900">{avgRating}</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={18}
                      fill={s <= Math.round(Number(avgRating)) ? '#f59e0b' : 'none'}
                      className={s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 uppercase tracking-wider font-medium">Trung bình đánh giá</p>
              </div>
              
              <div className="space-y-3">
                {starCounts.map(({ star, count }) => (
                  <button key={star}
                    onClick={() => setStarFilter(starFilter === star ? null : star)}
                    className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 transition-all ${
                      starFilter === star ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-600 w-3">{star}</span>
                    <Star size={14} fill="#f59e0b" className="text-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: allReviews.length ? `${(count / allReviews.length) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách đánh giá */}
          <div className="lg:col-span-3 space-y-4">
            {isReviewsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
                <Loader2 className="animate-spin text-blue-600 mb-2" />
                <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
                <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">Không tìm thấy đánh giá nào khớp với bộ lọc</p>
              </div>
            ) : (
              filtered.map((rv: ReviewResponse) => (
                <div key={rv.id} className={`bg-white rounded-xl border p-5 transition-all ${!rv.isPublished ? 'bg-gray-50 border-gray-200' : 'border-gray-200 shadow-sm'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                        {rv.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{rv.userName}</h3>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">{new Date(rv.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14}
                              fill={s <= Number(rv.rating) ? '#f59e0b' : 'none'}
                              className={s <= Number(rv.rating) ? 'text-amber-400' : 'text-gray-200'} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => toggleVisibility.mutate(rv.id)}
                        disabled={toggleVisibility.isPending}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          rv.isPublished 
                            ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' 
                            : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                        }`}
                      >
                        {toggleVisibility.isPending && toggleVisibility.variables === rv.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : rv.isPublished ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                        {rv.isPublished ? 'Ẩn đánh giá' : 'Hiện đánh giá'}
                      </button>
                      {!rv.isPublished && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Đang bị ẩn với công chúng</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pl-15">
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic leading-relaxed">
                      {rv.comment || 'Khách hàng không để lại lời nhắn.'}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="font-medium">Mã đơn: #{rv.bookingId}</span>
                      <span>•</span>
                      <span className="font-medium text-blue-600">{rv.hotelName}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}