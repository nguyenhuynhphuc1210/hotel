import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { PaymentResponse } from '@/types/payment.types'
import { PageResponse } from './hotel.api' 

const paymentApi = {
  getAll: (page = 0, size = 10) =>
    axiosInstance.get<PageResponse<PaymentResponse>>(API_CONFIG.ENDPOINTS.PAYMENTS, {
      params: { page, size }
    }),

  getById: (id: number | string) =>
    axiosInstance.get<PaymentResponse>(API_CONFIG.ENDPOINTS.PAYMENT_BY_ID(id)),

  getByBookingId: (bookingId: number | string) =>
    axiosInstance.get<PaymentResponse>(API_CONFIG.ENDPOINTS.PAYMENT_BY_BOOKING(bookingId)),

  processVnPayReturn: (queryString: string) => 
    axiosInstance.get(`${API_CONFIG.ENDPOINTS.VNPAY_RETURN}${queryString}`),

  processMomoReturn: (queryString: string) => 
    axiosInstance.get(`${API_CONFIG.ENDPOINTS.MOMO_RETURN}${queryString}`),
}

export default paymentApi