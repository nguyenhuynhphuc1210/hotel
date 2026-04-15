// lib/api/review.api.ts

import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { ReviewReportRequest, ReviewRequest, ReviewResponse } from '@/types/review.types'
import { PageResponse } from './hotel.api' 

const reviewApi = {
 
  getAll: (page = 0, size = 10) =>
    axiosInstance.get<PageResponse<ReviewResponse>>(API_CONFIG.ENDPOINTS.REVIEWS, {
      params: { page, size }
    }),

  getById: (id: number | string) =>
    axiosInstance.get<ReviewResponse>(API_CONFIG.ENDPOINTS.REVIEW_BY_ID(id)),

  create: (data: ReviewRequest) =>
    axiosInstance.post<ReviewResponse>(API_CONFIG.ENDPOINTS.REVIEWS, data),

  update: (id: number | string, data: ReviewRequest) =>
    axiosInstance.put<ReviewResponse>(API_CONFIG.ENDPOINTS.REVIEW_BY_ID(id), data),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.REVIEW_BY_ID(id)),

  toggleVisibility: (id: number | string) =>
    axiosInstance.patch<ReviewResponse>(`${API_CONFIG.ENDPOINTS.REVIEWS}/${id}/toggle-visibility`),
  
   getAdminReviewsByHotel: (hotelId: number | string, page = 0, size = 10) =>
    axiosInstance.get<PageResponse<ReviewResponse>>( 
      `/api/reviews/hotel/${hotelId}/admin`,
      { params: { page, size } }
    ),

    reportReview: (id: number | string, data: ReviewReportRequest) =>
    axiosInstance.patch<ReviewResponse>(`/api/reviews/${id}/report`, data),
 
  getReportedReviews: (page = 0, size = 50) =>
    axiosInstance.get<PageResponse<ReviewResponse>>(
      `/api/reviews/admin/reported`,
      { params: { page, size } }
    ),
 
  resolveReport: (id: number | string, isHideApproved: boolean) =>
    axiosInstance.patch<ReviewResponse>(`/api/reviews/${id}/resolve-report`, null, {
      params: { isHideApproved },
    }),
}

export default reviewApi