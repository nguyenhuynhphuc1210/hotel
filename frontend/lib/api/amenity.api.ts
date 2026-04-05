import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { 
  AmenityResponse, AmenityRequest, 
  HotelAmenityResponse, HotelAmenityRequest,
  RoomTypeAmenityResponse, RoomTypeAmenityRequest 
} from '@/types/amenity.types'

const amenityApi = {
  // GET /api/amenities
  getAll: () =>
    axiosInstance.get<AmenityResponse[]>(API_CONFIG.ENDPOINTS.AMENITIES),

  // GET /api/amenities/:id
  getById: (id: number | string) =>
    axiosInstance.get<AmenityResponse>(API_CONFIG.ENDPOINTS.AMENITY_BY_ID(id)),

  // POST /api/amenities
  create: (data: AmenityRequest) =>
    axiosInstance.post<AmenityResponse>(API_CONFIG.ENDPOINTS.AMENITIES, data),

  // PUT /api/amenities/:id
  update: (id: number | string, data: AmenityRequest) =>
    axiosInstance.put<AmenityResponse>(API_CONFIG.ENDPOINTS.AMENITY_BY_ID(id), data),

  // DELETE /api/amenities/:id
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.AMENITY_BY_ID(id)),
}

export const hotelAmenityApi = {
  // GET /api/hotel-amenities
  getAll: () =>
    axiosInstance.get<HotelAmenityResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES),

  // GET /api/hotel-amenities/hotel/:hotelId
  getByHotel: (hotelId: number | string) =>
    axiosInstance.get<HotelAmenityResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES_BY_HOTEL(hotelId)),

  // POST /api/hotel-amenities
  create: (data: HotelAmenityRequest) =>
    axiosInstance.post<HotelAmenityResponse>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES, data),

  // PUT /api/hotel-amenities
  update: (data: HotelAmenityRequest) =>
    axiosInstance.put<HotelAmenityResponse>(API_CONFIG.ENDPOINTS.HOTEL_AMENITIES, data),

  // DELETE /api/hotel-amenities/:hotelId/:amenityId
  delete: (hotelId: number | string, amenityId: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.HOTEL_AMENITY_BY_ID(hotelId, amenityId)),
}

export const roomTypeAmenityApi = {
  // GET /api/room-type-amenities
  getAll: () =>
    axiosInstance.get<RoomTypeAmenityResponse[]>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES),

  // GET /api/room-type-amenities/room-type/:roomTypeId
  getByRoomType: (roomTypeId: number | string) =>
    axiosInstance.get<RoomTypeAmenityResponse[]>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES_BY_ROOM_TYPE(roomTypeId)),

  // POST /api/room-type-amenities
  create: (data: RoomTypeAmenityRequest) =>
    axiosInstance.post<RoomTypeAmenityResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES, data),

  // PUT /api/room-type-amenities
  update: (data: RoomTypeAmenityRequest) =>
    axiosInstance.put<RoomTypeAmenityResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITIES, data),

  // DELETE /api/room-type-amenities/:roomTypeId/:amenityId
  delete: (roomTypeId: number | string, amenityId: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.ROOM_TYPE_AMENITY_BY_ID(roomTypeId, amenityId)),
}

export default amenityApi