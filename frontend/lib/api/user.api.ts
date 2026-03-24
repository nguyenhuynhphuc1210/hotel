import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { UserResponse, UserRequest } from '@/types/user.types'

const userApi = {
  // GET /api/users
  getAll: () =>
    axiosInstance.get<UserResponse[]>(API_CONFIG.ENDPOINTS.USERS),

  // GET /api/users/:id
  getById: (id: number | string) =>
    axiosInstance.get<UserResponse>(API_CONFIG.ENDPOINTS.USER_BY_ID(id)),

  // POST /api/users
  create: (data: UserRequest) =>
    axiosInstance.post<UserResponse>(API_CONFIG.ENDPOINTS.USERS, data),

  // PUT /api/users/:id
  update: (id: number | string, data: UserRequest) =>
    axiosInstance.put<UserResponse>(API_CONFIG.ENDPOINTS.USER_BY_ID(id), data),

  // DELETE /api/users/:id
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.USER_BY_ID(id)),

  // PATCH /api/users/:id/disable
  disable: (id: number | string) =>
    axiosInstance.patch<UserResponse>(`${API_CONFIG.ENDPOINTS.USER_BY_ID(id)}/disable`),

  // PATCH /api/users/:id/enable
  enable: (id: number | string) =>
    axiosInstance.patch<UserResponse>(`${API_CONFIG.ENDPOINTS.USER_BY_ID(id)}/enable`),
}

export default userApi