import { useMutation, useQueryClient } from '@tanstack/react-query'
import reviewApi from '@/lib/api/review.api'
import toast from 'react-hot-toast'

export const useToggleReviewVisibility = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reviewApi.toggleVisibility(id),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái hiển thị')
      qc.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái')
  })
}