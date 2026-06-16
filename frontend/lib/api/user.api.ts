import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { UserResponse, UserRequest, UpdateUserRequest, ChangePasswordRequest } from '@/types/user.types'
import { PageResponse } from './hotel.api'

const userApi = {
  
  
  getAll: (
    page = 0,
    size = 10,
    keyword?: string,
    role?: string
  ) =>
    axiosInstance.get<PageResponse<UserResponse>>(
      API_CONFIG.ENDPOINTS.USERS,
      {
        params: {
          page,
          size,
          keyword: keyword || undefined,
          role: role || undefined,
        },
      }
    ),

  
  getById: (id: number | string) =>
    axiosInstance.get<UserResponse>(API_CONFIG.ENDPOINTS.USER_BY_ID(id)),

  
  create: (data: UserRequest) =>
    axiosInstance.post<UserResponse>(API_CONFIG.ENDPOINTS.USERS, data),

  
  update: (id: number | string, data: UserRequest) =>
    axiosInstance.put<UserResponse>(API_CONFIG.ENDPOINTS.USER_BY_ID(id), data),

  
  delete: (id: number | string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.USER_BY_ID(id)),

  
  disable: (id: number | string) =>
    axiosInstance.patch<UserResponse>(`${API_CONFIG.ENDPOINTS.USER_BY_ID(id)}/disable`),

  
  enable: (id: number | string) =>
    axiosInstance.patch<UserResponse>(`${API_CONFIG.ENDPOINTS.USER_BY_ID(id)}/enable`),

  
  getMyProfile: () =>
    axiosInstance.get<UserResponse>(`${API_CONFIG.ENDPOINTS.USERS}/me`),

  
  updateMyProfile: (data: UpdateUserRequest) =>
    axiosInstance.put<UserResponse>(`${API_CONFIG.ENDPOINTS.USERS}/me`, data),

  
  changePassword: (data: ChangePasswordRequest) =>
    axiosInstance.put(`${API_CONFIG.ENDPOINTS.USERS}/change-password`, data),

  
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post<{ avatarUrl: string }>(`${API_CONFIG.ENDPOINTS.USERS}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export default userApi