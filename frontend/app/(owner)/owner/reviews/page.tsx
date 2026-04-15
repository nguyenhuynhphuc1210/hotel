'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Star, Search, MessageSquare, ChevronLeft, ChevronRight,
  X, Send, CornerDownRight, Flag, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import { ReviewResponse } from '@/types/review.types'
import { useOwnerHotel } from '../../owner-hotel-context'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'
import { useReportReview } from '@/hooks/useReviews'

interface ApiErrorResponse {
  message: string
}

const reviewApi = {
  getAdminReviewsByHotel: (hotelId: number | string): Promise<ReviewResponse[]> =>
    axiosInstance
      .get<{ content: ReviewResponse[] }>(`/api/reviews/hotel/${hotelId}/admin`, {
        params: { page: 0, size: 100 },
      })
      .then(r => r.data.content),

  replyToReview: (id: number | string, reply: string): Promise<ReviewResponse> =>
    axiosInstance
      .patch<ReviewResponse>(`/api/reviews/${id}/reply`, { reply })
      .then(r => r.data),
}

export default function OwnerReviewsPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [starFilter, setStarFilter] = useState<number | null>(null)

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Reply modal
  const [replyingReview, setReplyingReview] = useState<ReviewResponse | null>(null)
  const [replyText, setReplyText] = useState('')

  // Report modal
  const [reportingReview, setReportingReview] = useState<ReviewResponse | null>(null)
  const [reportReason, setReportReason] = useState('')

  const { activeHotel, activeHotelId, isLoading: isHotelLoading } = useOwnerHotel()

  const { data: allReviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['owner-reviews', activeHotelId],
    queryFn: () => reviewApi.getAdminReviewsByHotel(activeHotelId!),
    enabled: !!activeHotelId,
    retry: false,
  })

  const replyMutation = useMutation<
    ReviewResponse,
    AxiosError<ApiErrorResponse>,
    { id: number; reply: string }
  >({
    mutationFn: ({ id, reply }) => reviewApi.replyToReview(id, reply),
    onSuccess: () => {
      toast.success('Gửi phản hồi thành công')
      queryClient.invalidateQueries({ queryKey: ['owner-reviews', activeHotelId] })
      closeReplyModal()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể gửi phản hồi')
    },
  })

  const reportMutation = useReportReview(activeHotelId ?? undefined)

  const hotel = activeHotel
  const isLoading = isReviewsLoading || isHotelLoading

  // Lightbox
  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images); setLightboxIndex(index); setLightboxOpen(true)
  }
  const closeLightbox = () => setLightboxOpen(false)
  const prevImg = () => setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length)
  const nextImg = () => setLightboxIndex(i => (i + 1) % lightboxImages.length)

  // Reply
  const openReplyModal = (review: ReviewResponse) => {
    setReplyingReview(review); setReplyText(review.ownerReply || '')
  }
  const closeReplyModal = () => { setReplyingReview(null); setReplyText('') }
  const handleSendReply = () => {
    if (!replyingReview || !replyText.trim()) return
    replyMutation.mutate({ id: replyingReview.id, reply: replyText })
  }

  // Report
  const openReportModal = (review: ReviewResponse) => {
    setReportingReview(review); setReportReason('')
  }
  const closeReportModal = () => { setReportingReview(null); setReportReason('') }
  const handleSendReport = () => {
    if (!reportingReview || !reportReason.trim()) return
    reportMutation.mutate(
      { id: reportingReview.id, data: { reason: reportReason } },
      { onSuccess: closeReportModal }
    )
  }

  if (!hotel && !isHotelLoading)
    return <div className="py-20 text-center text-gray-400">Chưa chọn khách sạn</div>

  const filtered = allReviews.filter((rv: ReviewResponse) => {
    const matchKeyword =
      !keyword ||
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
      {/* ── Lightbox ─────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button className="absolute top-6 right-6 text-white hover:text-gray-300" onClick={closeLightbox}>
            <X size={32} />
          </button>
          {lightboxImages.length > 1 && (
            <>
              <button className="absolute left-6 text-white p-2 hover:bg-white/10 rounded-full" onClick={e => { e.stopPropagation(); prevImg() }}>
                <ChevronLeft size={40} />
              </button>
              <button className="absolute right-6 text-white p-2 hover:bg-white/10 rounded-full" onClick={e => { e.stopPropagation(); nextImg() }}>
                <ChevronRight size={40} />
              </button>
            </>
          )}
          <img
            src={lightboxImages[lightboxIndex]}
            alt="Review enlarged"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Reply Modal ───────────────────────────── */}
      {replyingReview && (
        <div className="fixed inset-0 z-[998] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Phản hồi đánh giá của {replyingReview.userName}</h3>
              <button onClick={closeReplyModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 italic">
                {replyingReview.comment}
              </div>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi của bạn..."
                className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={closeReplyModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={replyMutation.isPending || !replyText.trim()}
                  className="flex-[2] px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {replyMutation.isPending ? 'Đang gửi...' : <><Send size={16} /> Gửi phản hồi</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Modal ──────────────────────────── */}
      {reportingReview && (
        <div className="fixed inset-0 z-[998] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Flag size={15} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Báo cáo đánh giá</h3>
                  <p className="text-xs text-gray-400">của {reportingReview.userName}</p>
                </div>
              </div>
              <button onClick={closeReportModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Preview đánh giá bị báo cáo */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={11}
                        fill={s <= Number(reportingReview.rating) ? '#f59e0b' : 'none'}
                        className={s <= Number(reportingReview.rating) ? 'text-amber-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-700">{reportingReview.rating}</span>
                </div>
                <p className="text-sm text-gray-600 italic line-clamp-3">{reportingReview.comment || '(Không có nội dung)'}</p>
              </div>

              {/* Lý do báo cáo nhanh */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lý do báo cáo</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  'Nội dung không phù hợp',
                  'Thông tin sai sự thật',
                  'Ngôn ngữ thô tục',
                  'Spam / quảng cáo',
                  'Vi phạm quy định',
                ].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setReportReason(preset)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      reportReason === preset
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Hoặc nhập lý do cụ thể để Admin xem xét..."
                className="w-full h-24 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none text-sm resize-none"
              />

              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Báo cáo sẽ được gửi lên Admin để xem xét. Admin sẽ quyết định ẩn hoặc giữ nguyên đánh giá.</p>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={closeReportModal} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleSendReport}
                  disabled={reportMutation.isPending || !reportReason.trim()}
                  className="flex-[2] px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {reportMutation.isPending ? 'Đang gửi...' : <><Flag size={16} /> Gửi báo cáo</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ───────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đánh giá khách hàng</h1>
        <p className="text-sm text-gray-500 mt-1">{hotel?.hotelName} · {allReviews.length} đánh giá</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Sidebar thống kê ─────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-gray-900">{avgRating}</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={16}
                  fill={s <= Math.round(Number(avgRating)) ? '#f59e0b' : 'none'}
                  className={s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-300'}
                />
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">{allReviews.length} đánh giá</div>
          </div>
          <div className="space-y-2">
            {starCounts.map(({ star, count }) => (
              <button key={star}
                onClick={() => setStarFilter(starFilter === star ? null : star)}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${starFilter === star ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
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

        {/* ── Danh sách đánh giá ───────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm tên khách, nội dung..."
              value={keyword} onChange={e => setKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-gray-400">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Chưa có đánh giá nào</p>
            </div>
          ) : (
            filtered.map((rv: ReviewResponse) => {
              const rvImages = rv.images?.map(img => img.imageUrl) || []
              const alreadyReported = !!rv.isReported

              return (
                <div
                  key={rv.id}
                  className={`bg-white rounded-xl border p-5 hover:border-blue-200 transition-colors ${
                    alreadyReported ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                        {rv.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{rv.userName}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(rv.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alreadyReported && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          <Flag size={10} /> Đã báo cáo
                        </span>
                      )}
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg shrink-0">
                        <Star size={12} fill="#f59e0b" className="text-amber-400" />
                        <span className="text-xs font-bold text-amber-700">{rv.rating}</span>
                      </div>
                    </div>
                  </div>

                  {rv.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{rv.comment}</p>
                  )}

                  {/* Hiển thị lý do báo cáo nếu đã báo cáo */}
                  {alreadyReported && rv.reportReason && (
                    <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                      <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Lý do báo cáo: </span>
                        <span className="text-xs text-red-700">{rv.reportReason}</span>
                      </div>
                    </div>
                  )}

                  {rvImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {rvImages.map((url, idx) => (
                        <div
                          key={idx}
                          className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100 cursor-pointer hover:opacity-80 transition-all shadow-sm"
                          onClick={() => openLightbox(rvImages, idx)}
                        >
                          <img src={url} alt={`Review ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {rv.ownerReply && (
                    <div className="mt-3 ml-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-1">
                        <CornerDownRight size={14} className="text-blue-500" />
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Phản hồi từ chủ chỗ nghỉ</span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {rv.replyDate ? new Date(rv.replyDate).toLocaleDateString('vi-VN') : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 italic">{rv.ownerReply}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <div>
                      {!rv.isPublished && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          Chưa hiển thị
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Nút báo cáo */}
                      {alreadyReported ? (
                        <span className="text-xs text-red-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={13} /> Đã gửi báo cáo
                        </span>
                      ) : (
                        <button
                          onClick={() => openReportModal(rv)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                        >
                          <Flag size={13} /> Báo cáo
                        </button>
                      )}
                      <span className="text-gray-200">|</span>
                      {/* Nút phản hồi */}
                      <button
                        onClick={() => openReplyModal(rv)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {rv.ownerReply ? 'Chỉnh sửa phản hồi' : 'Gửi phản hồi'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}