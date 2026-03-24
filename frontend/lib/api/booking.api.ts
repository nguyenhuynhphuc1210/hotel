import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { BookingResponse } from '@/types/booking.types'

const bookingApi = {
  // GET /api/bookings → getAllBookings()
  getAll: () =>
    axiosInstance.get<BookingResponse[]>(API_CONFIG.ENDPOINTS.BOOKINGS),

  // GET /api/bookings/:id → getBookingById()
  getById: (id: number | string) =>
    axiosInstance.get<BookingResponse>(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id)),

  // DELETE /api/bookings/:id → deleteBooking()
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.BOOKING_BY_ID(id)),
}

export default bookingApi