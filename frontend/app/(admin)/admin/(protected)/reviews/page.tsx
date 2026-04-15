'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Star, Search, MessageSquare, Eye, EyeOff, Loader2, FilterX,
  Flag, ShieldCheck, ShieldX, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { ReviewResponse } from '@/types/review.types'
import { HotelResponse } from '@/lib/api/hotel.api'
import { useToggleReviewVisibility, useReportedReviews, useResolveReport } from '@/hooks/useReviews'
import Pagination from '@/components/ui/Pagination'

type TabType = 'all' | 'reported'

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [keyword, setKeyword] = useState('')
  const [starFilter, setStarFilter] = useState<number | null>(null)
  const [ownerFilter, setOwnerFilter] = useState('')
  const [hotelFilter, setHotelFilter] = useState<number | ''>('')

  // State phân trang cho Tab All
  const [pageAll, setPageAll] = useState(0)
  const [sizeAll, setSizeAll] = useState(10)

  // State phân trang cho Tab Reported
  const [pageReported, setPageReported] = useState(0)
  const [sizeReported, setSizeReported] = useState(10)

  const toggleVisibility = useToggleReviewVisibility()
  const resolveReport = useResolveReport()

  // 1. Lấy danh sách khách sạn
  const { data: hotels = [] } = useQuery<HotelResponse[]>({
    queryKey: ['admin-hotels-list'],
    queryFn: () => axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, {
      params: { page: 0, size: 100 }
    }).then(r => r.data.content),
  })

  // 2. Lấy đánh giá theo khách sạn (Tab All)
  const { data: reviewData, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['admin-reviews', hotelFilter, pageAll, sizeAll],
    queryFn: () => {
      if (!hotelFilter) return { content: [], totalElements: 0, totalPages: 0 }
      return axiosInstance
        .get<{ content: ReviewResponse[], totalElements: number, totalPages: number }>(
          `/api/reviews/hotel/${hotelFilter}/admin`, 
          { params: { page: pageAll, size: sizeAll } }
        )
        .then(r => r.data)
    },
    enabled: !!hotelFilter && activeTab === 'all',
  })

  // 3. Lấy danh sách đánh giá bị báo cáo (Tab Reported)
  const { data: reportedPageData, isLoading: isReportedLoading } = useReportedReviews(pageReported, sizeReported)

  // FIX LỖI: Trích xuất mảng từ đối tượng PageResponse
  const allReviews = reviewData?.content || []
  const reportedReviews = reportedPageData?.content || []

  const owners = Array.from(
    new Map(hotels.map(h => [h.ownerId, { id: h.ownerId, name: h.ownerName }])).values()
  )

  // Filter client-side (chỉ lọc trên dữ liệu của trang hiện tại)
  const filtered = allReviews.filter((rv: ReviewResponse) => {
    const matchKeyword =
      !keyword ||
      rv.userName.toLowerCase().includes(keyword.toLowerCase()) ||
      (rv.comment ?? '').toLowerCase().includes(keyword.toLowerCase())
    const matchStar = starFilter === null || Math.floor(Number(rv.rating)) === starFilter
    return matchKeyword && matchStar
  })

  const avgRating = allReviews.length
    ? (allReviews.reduce((s, r) => s + Number(r.rating), 0) / allReviews.length).toFixed(1)
    : '0'

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: allReviews.filter(r => Math.floor(Number(r.rating)) === s).length,
  }))

  const pendingReportedCount = reportedPageData?.totalElements || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá</h1>
          <p className="text-sm text-gray-500 mt-1">Hệ thống Admin · Kiểm duyệt phản hồi khách hàng</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tất cả đánh giá
        </button>
        <button
          onClick={() => setActiveTab('reported')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'reported' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Flag size={14} />
          Báo cáo chờ duyệt
          {pendingReportedCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingReportedCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB: BÁO CÁO CHỜ DUYỆT */}
      {activeTab === 'reported' && (
        <div className="space-y-4">
          {isReportedLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
              <Loader2 className="animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-gray-500">Đang tải danh sách báo cáo...</p>
            </div>
          ) : reportedReviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-20 text-center">
              <CheckCircle2 size={48} className="text-green-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Không có báo cáo nào đang chờ xử lý</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Có <span className="font-bold">{pendingReportedCount}</span> đánh giá đang bị báo cáo.
                </p>
              </div>

              <div className="space-y-4">
                {reportedReviews.map((rv: ReviewResponse) => (
                  <div key={rv.id} className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="bg-red-50 border-b border-red-100 px-5 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag size={13} className="text-red-500" />
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Đánh giá bị báo cáo</span>
                        <span className="text-[10px] text-red-400">· {rv.hotelName}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {rv.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-sm">{rv.userName}</span>
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg text-xs font-bold text-amber-700">
                              <Star size={12} fill="#f59e0b" className="text-amber-400" /> {rv.rating}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-lg italic">
                            {rv.comment || '(Không có nội dung)'}
                          </p>
                        </div>
                      </div>

                      {rv.reportReason && (
                        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm">
                          <p className="text-[11px] font-bold text-red-500 uppercase mb-1">Lý do báo cáo</p>
                          <p className="text-red-800">{rv.reportReason}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                        <div className="flex-1" />
                        <button
                          onClick={() => resolveReport.mutate({ id: rv.id, isHideApproved: false })}
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                          Bác bỏ báo cáo
                        </button>
                        <button
                          onClick={() => resolveReport.mutate({ id: rv.id, isHideApproved: true })}
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
                        >
                          Duyệt & Ẩn đánh giá
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PHÂN TRANG TAB REPORTED */}
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <Pagination
                  currentPage={pageReported}
                  pageSize={sizeReported}
                  totalPages={reportedPageData?.totalPages || 0}
                  totalElements={reportedPageData?.totalElements || 0}
                  onPageChange={setPageReported}
                  onPageSizeChange={setSizeReported}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: TẤT CẢ ĐÁNH GIÁ */}
      {activeTab === 'all' && (
        <>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <select
              value={ownerFilter}
              onChange={e => { setOwnerFilter(e.target.value); setHotelFilter(''); setPageAll(0) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[160px]"
            >
              <option value="">Tất cả chủ sở hữu</option>
              {owners.map(o => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
            </select>

            <select
              value={hotelFilter}
              onChange={e => { setHotelFilter(e.target.value ? Number(e.target.value) : ''); setPageAll(0) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]"
            >
              <option value="">Chọn khách sạn</option>
              {(ownerFilter ? hotels.filter(h => String(h.ownerId) === ownerFilter) : hotels).map(h => (
                <option key={h.id} value={h.id}>{h.hotelName}</option>
              ))}
            </select>

            {(keyword || starFilter || hotelFilter || ownerFilter) && (
              <button
                onClick={() => { setKeyword(''); setStarFilter(null); setHotelFilter(''); setOwnerFilter(''); setPageAll(0) }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-extrabold text-gray-900">{avgRating}</div>
                    <p className="text-xs text-gray-400 mt-2 uppercase">Trung bình đánh giá</p>
                  </div>
                  {/* ... Star count progress bars ... */}
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                {isReviewsLoading ? (
                  <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>
                ) : (
                  <>
                    {filtered.map((rv: ReviewResponse) => (
                      <div key={rv.id} className={`bg-white rounded-xl border p-5 ${rv.isReported ? 'border-red-200 bg-red-50/20' : 'border-gray-200 shadow-sm'}`}>
                        {/* Review Item Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                              {rv.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-900">{rv.userName}</h3>
                                {rv.isReported && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Đã báo cáo</span>}
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-amber-400">
                                <Star size={14} fill="currentColor" /> <span className="text-sm font-bold text-gray-700">{rv.rating}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleVisibility.mutate(rv.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                          >
                            {rv.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <p className="mt-4 text-sm text-gray-700 italic leading-relaxed bg-gray-50 p-3 rounded-lg">
                           {rv.comment || 'Không có bình luận'}
                        </p>
                      </div>
                    ))}

                    {/* PHÂN TRANG TAB ALL */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <Pagination
                        currentPage={pageAll}
                        pageSize={sizeAll}
                        totalPages={reviewData?.totalPages || 0}
                        totalElements={reviewData?.totalElements || 0}
                        onPageChange={setPageAll}
                        onPageSizeChange={setSizeAll}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}