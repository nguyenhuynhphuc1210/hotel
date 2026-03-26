import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { RoomTypeResponse, RoomTypeRequest } from '@/types/room.types'

const roomApi = {
  getAll: () =>
    axiosInstance.get<RoomTypeResponse[]>(API_CONFIG.ENDPOINTS.ROOM_TYPES),

  getById: (id: number | string) =>
    axiosInstance.get<RoomTypeResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPE_BY_ID(id)),

  getByHotelId: (hotelId: number | string) =>
    axiosInstance.get<RoomTypeResponse[]>(`${API_CONFIG.ENDPOINTS.ROOM_TYPES}/hotel/${hotelId}`),

  create: (data: RoomTypeRequest) =>
    axiosInstance.post<RoomTypeResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPES, data),

  update: (id: number | string, data: RoomTypeRequest) =>
    axiosInstance.put<RoomTypeResponse>(API_CONFIG.ENDPOINTS.ROOM_TYPE_BY_ID(id), data),

  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.ROOM_TYPE_BY_ID(id)),
}

export default roomApi