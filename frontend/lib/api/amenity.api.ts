import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { AmenityResponse, AmenityRequest, HotelAmenityResponse, HotelAmenityRequest } from '@/types/amenity.types'

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

export default amenityApi