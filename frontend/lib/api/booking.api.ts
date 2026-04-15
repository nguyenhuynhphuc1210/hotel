import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { BookingRequest, BookingResponse, BookingStatus } from '@/types/booking.types'
import { PageResponse } from './hotel.api' 

const bookingApi = {
  
  getAll: (page = 0, size = 10) =>
    axiosInstance.get<PageResponse<BookingResponse>>(`${API_CONFIG.ENDPOINTS.BOOKINGS}/admin`, {
      params: { page, size }
    }),

  getById: (id: number | string) =>
    axiosInstance.get<BookingResponse>(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id)),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id)),

  create: (data: BookingRequest) => 
    axiosInstance.post<BookingResponse>(API_CONFIG.ENDPOINTS.BOOKINGS, data),

  updateStatus: (id: number | string, status: BookingStatus) =>
    axiosInstance.patch<BookingResponse>(`${API_CONFIG.ENDPOINTS.BOOKINGS}/${id}/status`, { status }),

  getMyBookings: (page = 0, size = 10) => 
    axiosInstance.get<PageResponse<BookingResponse>>(`${API_CONFIG.ENDPOINTS.BOOKINGS}/me`, {
      params: { page, size }
    }),
}

export default bookingApi