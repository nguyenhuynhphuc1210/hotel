import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import reviewApi from '@/lib/api/review.api'
import toast from 'react-hot-toast'
import { ReviewReportRequest } from '@/types/review.types'

export const useToggleReviewVisibility = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reviewApi.toggleVisibility(id),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái hiển thị')
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
      qc.invalidateQueries({ queryKey: ['admin-reported-reviews'] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái'),
  })
}

export const useReportReview = (hotelId?: number | string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewReportRequest }) =>
      reviewApi.reportReview(id, data),
    onSuccess: () => {
      toast.success('Báo cáo đã được gửi lên Admin')
      qc.invalidateQueries({ queryKey: ['owner-reviews', hotelId] })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message
      toast.error(msg || 'Không thể gửi báo cáo')
    },
  })
}

export const useReportedReviews = (page = 0, size = 10) => {
  return useQuery({
    queryKey: ['admin-reported-reviews', page, size],
    queryFn: () => reviewApi.getReportedReviews(page, size).then(r => r.data),
  })
}

export const useResolveReport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isHideApproved }: { id: number; isHideApproved: boolean }) =>
      reviewApi.resolveReport(id, isHideApproved),
    onSuccess: (_, variables) => {
      toast.success(
        variables.isHideApproved
          ? 'Đã ẩn đánh giá theo báo cáo'
          : 'Đã bác bỏ báo cáo, đánh giá vẫn hiển thị'
      )
      qc.invalidateQueries({ queryKey: ['admin-reported-reviews'] })
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: () => toast.error('Không thể xử lý báo cáo'),
  })
}