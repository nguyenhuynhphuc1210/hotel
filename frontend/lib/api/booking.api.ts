import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { BookingRequest, BookingResponse, BookingStatus } from '@/types/booking.types'

const bookingApi = {
  // GET /api/bookings → getAllBookings()
  getAll: () =>
    axiosInstance.get<BookingResponse[]>(`${API_CONFIG.ENDPOINTS.BOOKINGS}/admin`), 

  // GET /api/bookings/:id → getBookingById()
  getById: (id: number | string) =>
    axiosInstance.get<BookingResponse>(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id)),

  // DELETE /api/bookings/:id → deleteBooking()
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id)),

  create: (data: BookingRequest) => 
        axiosInstance.post<BookingResponse>(API_CONFIG.ENDPOINTS.BOOKINGS, data),

   updateStatus: (id: number | string, status: BookingStatus) =>
    axiosInstance.patch<BookingResponse>(`${API_CONFIG.ENDPOINTS.BOOKINGS}/${id}/status`, { status }),

   getMyBookings: () => 
    axiosInstance.get<BookingResponse[]>(`${API_CONFIG.ENDPOINTS.BOOKINGS}/me`),
   
}

export default bookingApi