'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star, Search, MessageSquare } from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { ReviewResponse } from '@/types/review.types'
import { useOwnerHotel } from '../../owner-hotel-context'

export default function OwnerReviewsPage() {
  const [keyword, setKeyword] = useState('')
  const [starFilter, setStarFilter] = useState<number | null>(null)

  // 1. Lấy khách sạn từ Context
  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  // 2. Lấy đánh giá dựa trên activeHotelId
  const { data: allReviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['owner-reviews', activeHotelId],
    queryFn: () => axiosInstance
      .get<ReviewResponse[]>(API_CONFIG.ENDPOINTS.REVIEWS)
      .then(r => r.data.filter((rv: ReviewResponse) => rv.hotelId === activeHotelId)),
    enabled: !!activeHotelId,
  })

  // Đặt lại tên biến để tương thích UI bên dưới
  const hotel = activeHotel
  const isLoading = isReviewsLoading || isHotelLoading

  if (!hotel && !isHotelLoading) return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>
  

  const filtered = allReviews.filter((rv: ReviewResponse) => {
    const matchKeyword = !keyword ||
      rv.userName.toLowerCase().includes(keyword.toLowerCase()) ||
      (rv.comment ?? '').toLowerCase().includes(keyword.toLowerCase())
    const matchStar = starFilter === null || Math.floor(Number(rv.rating)) === starFilter
    return matchKeyword && matchStar
  })

  const avgRating = allReviews.length
    ? (allReviews.reduce((s: number, r: ReviewResponse) => s + Number(r.rating), 0) / allReviews.length).toFixed(1)
    : '—'

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: allReviews.filter((r: ReviewResponse) => Math.floor(Number(r.rating)) === s).length,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đánh giá khách hàng</h1>
        <p className="text-sm text-gray-500 mt-1">{hotel?.hotelName} · {allReviews.length} đánh giá</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rating summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-gray-900">{avgRating}</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16}
                  fill={s <= Math.round(Number(avgRating)) ? '#f59e0b' : 'none'}
                  className={s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-300'} />
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">{allReviews.length} đánh giá</div>
          </div>
          <div className="space-y-2">
            {starCounts.map(({ star, count }) => (
              <button key={star}
                onClick={() => setStarFilter(starFilter === star ? null : star)}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                  starFilter === star ? 'bg-amber-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-xs text-gray-500 w-4">{star}</span>
                <Star size={12} fill="#f59e0b" className="text-amber-400 shrink-0" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: allReviews.length ? `${(count / allReviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Review list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm tên khách, nội dung..."
              value={keyword} onChange={e => setKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Chưa có đánh giá nào</p>
            </div>
          ) : (
            filtered.map((rv: ReviewResponse) => (
              <div key={rv.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                      {rv.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{rv.userName}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(rv.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13}
                        fill={s <= Number(rv.rating) ? '#f59e0b' : 'none'}
                        className={s <= Number(rv.rating) ? 'text-amber-400' : 'text-gray-200'} />
                    ))}
                    <span className="text-xs font-semibold text-gray-700 ml-1">{rv.rating}</span>
                  </div>
                </div>
                {rv.comment && (
                  <p className="text-sm text-gray-600 leading-relaxed">{rv.comment}</p>
                )}
                {!rv.isPublished && (
                  <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Chưa hiển thị
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}