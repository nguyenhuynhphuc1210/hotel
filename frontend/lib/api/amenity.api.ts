import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { 
  AmenityResponse, AmenityRequest, 
  HotelAmenityResponse, HotelAmenityRequest,
  RoomTypeAmenityResponse, RoomTypeAmenityRequest 
} from '@/types/amenity.types'

const amenityApi = {
  
  getAll: () =>
    axiosInstance.get<AmenityResponse[]>(API_CONFIG.ENDPOINTS.AMENITIES),

  
  getById: (id: number | string) =>
    axiosInstance.get<AmenityResponse>(API_CONFIG.ENDPOINTS.AMENITY_BY_ID(id)),

  
  create: (data: AmenityRequest) =>
    axiosInstance.post<AmenityResponse>(API_CONFIG.ENDPOINTS.AMENITIES, data),

  
  update: (id: number | string, data: AmenityRequest) =>
    axiosInstance.put<AmenityResponse>(API_CONFIG.ENDPOINTS.AMENITY_BY_ID(id), data),

  
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.AMENITY_BY_ID(id)),
}

export const hotelAmenityApi = {
  
  getAll: () =>
    axiosInstance.get<HotelAmenityResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES),

  
  getByHotel: (hotelId: number | string) =>
    axiosInstance.get<HotelAmenityResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES_BY_HOTEL(hotelId)),

  
  create: (data: HotelAmenityRequest) =>
    axiosInstance.post<HotelAmenityResponse>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES, data),

  
  update: (data: HotelAmenityRequest) =>
    axiosInstance.put<HotelAmenityResponse>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES, data),

  
  delete: (hotelId: number | string, amenityId: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.HOTEL_AMENITY_BY_ID(hotelId, amenityId)),
}

export const roomTypeAmenityApi = {
  
  getAll: () =>
    axiosInstance.get<RoomTypeAmenityResponse[]>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES),

  
  getByRoomType: (roomTypeId: number | string) =>
    axiosInstance.get<RoomTypeAmenityResponse[]>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES_BY_ROOM_TYPE(roomTypeId)),

  
  create: (data: RoomTypeAmenityRequest) =>
    axiosInstance.post<RoomTypeAmenityResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES, data),

  
  update: (data: RoomTypeAmenityRequest) =>
    axiosInstance.put<RoomTypeAmenityResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES, data),

  
  delete: (roomTypeId: number | string, amenityId: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITY_BY_ID(roomTypeId, amenityId)),
}

export default amenityApi