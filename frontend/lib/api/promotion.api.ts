import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { PromotionResponse, PromotionRequest } from '@/types/promotion.types'

const promotionApi = {
  getAll: () =>
    axiosInstance.get<PromotionResponse[]>(API_CONFIG.ENDPOINTS.PROMOTIONS),

  getById: (id: number | string) =>
    axiosInstance.get<PromotionResponse>(API_CONFIG.ENDPOINTS.PROMOTION_BY_ID(id)),

  create: (data: PromotionRequest) =>
    axiosInstance.post<PromotionResponse>(API_CONFIG.ENDPOINTS.PROMOTIONS, data),

  update: (id: number | string, data: PromotionRequest) =>
    axiosInstance.put<PromotionResponse>(API_CONFIG.ENDPOINTS.PROMOTION_BY_ID(id), data),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.PROMOTION_BY_ID(id)),

  
}

export default promotionApi