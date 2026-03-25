// lib/api/review.api.ts

import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { ReviewRequest, ReviewResponse } from '@/types/review.types'

const reviewApi = {
  /**
   * Lấy danh sách tất cả review
   */
  getAll: () =>
    axiosInstance.get<ReviewResponse[]>(API_CONFIG.ENDPOINTS.REVIEWS),

  /**
   * Lấy chi tiết một review theo ID
   */
  getById: (id: number | string) =>
    axiosInstance.get<ReviewResponse>(API_CONFIG.ENDPOINTS.REVIEW_BY_ID(id)),

  /**
   * Tạo review mới sau khi hoàn tất đặt phòng
   * Body gồm: bookingId, rating (1-5), comment
   */
  create: (data: ReviewRequest) =>
    axiosInstance.post<ReviewResponse>(API_CONFIG.ENDPOINTS.REVIEWS, data),

  /**
   * Cập nhật review (chỉnh sửa đánh giá hoặc bình luận)
   */
  update: (id: number | string, data: ReviewRequest) =>
    axiosInstance.put<ReviewResponse>(API_CONFIG.ENDPOINTS.REVIEW_BY_ID(id), data),

  /**
   * Xóa review
   */
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.REVIEW_BY_ID(id)),
}

export default reviewApi