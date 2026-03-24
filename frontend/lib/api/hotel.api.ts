import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'

export interface HotelResponse {
  id: number
  hotelName: string
  description: string | null
  starRating: number
  addressLine: string
  ward: string
  district: string
  city: string
  phone: string
  email: string
  ownerId: number
  ownerName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  roomTypes: RoomTypeResponse[]
  images: HotelImageResponse[]
}

export interface HotelRequest {
  hotelName: string
  description?: string
  addressLine: string
  ward: string
  district: string
  city: string
  phone: string
  email: string
  ownerId?: number
}

export interface HotelImageResponse {
  id: number
  hotelId: number
  hotelName: string
  imageUrl: string
  isPrimary: boolean
  publicId: string
}

export interface RoomTypeResponse {
  id: number
  name: string
  price: number
  capacity: number
}

const hotelApi = {
  getAll: () =>
    axiosInstance.get<HotelResponse[]>(API_CONFIG.ENDPOINTS.HOTELS),

  getById: (id: number | string) =>
    axiosInstance.get<HotelResponse>(API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)),

  create: (data: HotelRequest) =>
    axiosInstance.post<HotelResponse>(API_CONFIG.ENDPOINTS.HOTELS, data),

  update: (id: number | string, data: HotelRequest) =>
    axiosInstance.put<HotelResponse>(API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id), data),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)),

  // PATCH /api/hotels/:id/approve
  approve: (id: number | string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/approve`),

  // PATCH /api/hotels/:id/disable
  disable: (id: number | string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/disable`),
}

export default hotelApi