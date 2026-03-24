import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { HotelPolicyResponse, HotelPolicyRequest } from '@/types/policy.types'

const policyApi = {
  getAll: () =>
    axiosInstance.get<HotelPolicyResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_POLICIES),

  getById: (id: number | string) =>
    axiosInstance.get<HotelPolicyResponse>(API_CONFIG.ENDPOINTS.HOTEL_POLICY_BY_ID(id)),

  create: (data: HotelPolicyRequest) =>
    axiosInstance.post<HotelPolicyResponse>(API_CONFIG.ENDPOINTS.HOTEL_POLICIES, data),

  update: (id: number | string, data: HotelPolicyRequest) =>
    axiosInstance.put<HotelPolicyResponse>(API_CONFIG.ENDPOINTS.HOTEL_POLICY_BY_ID(id), data),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.HOTEL_POLICY_BY_ID(id)),
}

export default policyApi