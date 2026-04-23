import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'

export enum HotelStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
  REJECTED = 'REJECTED',
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
  status: HotelStatus
  statusReason?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
  roomTypes: RoomTypeResponse[]
  thumbnailUrl?: string
  images?: HotelImageResponse[]
}

export interface HotelSummaryResponse {
  id: number
  hotelName: string
  starRating: number
  addressLine: string
  ward: string
  district: string
  city: string
  thumbnailUrl?: string
  images?: HotelImageResponse[]
  minPrice?: number
  isActive: boolean
}

export interface PageResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
  number: number
  size: number
  first: boolean
  last: boolean
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

export interface HotelSearchParams {
  district?: string
  keyword?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  page?: number
  size?: number
}

export interface HotelAdminResponse {
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
  ownerEmail: string
  status: HotelStatus
  statusReason?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
  roomTypes: RoomTypeResponse[]
  thumbnailUrl?: string
  images?: HotelImageResponse[]
}

const hotelApi = {
  getAll: (page = 0, size = 100) =>
    axiosInstance.get<PageResponse<HotelResponse>>(API_CONFIG.ENDPOINTS.HOTELS, {
      params: { page, size }
    }),

  getById: (id: number | string) =>
    axiosInstance.get<HotelResponse>(API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)),

  create: (data: HotelRequest) =>
    axiosInstance.post<HotelResponse>(API_CONFIG.ENDPOINTS.HOTELS, data),

  update: (id: number | string, data: HotelRequest) =>
    axiosInstance.put<HotelResponse>(API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id), data),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)),

  approve: (id: number | string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/approve`),

  disable: (id: number | string, reason: string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/disable`, { reason }),

  reject: (id: number | string, reason: string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/reject`, { reason }),

  suspend: (id: number | string, reason?: string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/suspend`, { reason }),
 
  reactivate: (id: number | string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/reactivate`),

  getActive: (page = 0, size = 9) =>
    axiosInstance.get<PageResponse<HotelSummaryResponse>>(
      `${API_CONFIG.ENDPOINTS.HOTELS}/active`,
      { params: { page, size } }
    ),

  search: (params: HotelSearchParams) =>
    axiosInstance.get<PageResponse<HotelSummaryResponse>>(
      `${API_CONFIG.ENDPOINTS.HOTELS}/search`,
      { params }
    ),

  getMinPrice: (id: number | string, checkIn: string, checkOut: string) =>
    axiosInstance.get<number>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/min-price`, {
      params: { checkIn, checkOut },
    }),

  getDeleted: (page = 0, size = 10) =>
    axiosInstance.get<PageResponse<HotelResponse>>(
      `${API_CONFIG.ENDPOINTS.HOTELS}/deleted`,
      { params: { page, size } }
    ),

  restore: (id: number | string) =>
    axiosInstance.patch<HotelResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)}/restore`),
}

export default hotelApi