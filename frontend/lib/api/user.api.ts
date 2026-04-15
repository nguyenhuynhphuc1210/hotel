import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { UserResponse, UserRequest, UpdateUserRequest, ChangePasswordRequest } from '@/types/user.types'
import { PageResponse } from './hotel.api' 

const userApi = {
  // GET /api/users
  getAll: (page = 0, size = 10) =>
    axiosInstance.get<PageResponse<UserResponse>>(API_CONFIG.ENDPOINTS.USERS, {
      params: { page, size }
    }),

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

  // Lấy profile của tôi
  getMyProfile: () => 
    axiosInstance.get<UserResponse>(`${API_CONFIG.ENDPOINTS.USERS}/me`),

  // Cập nhật profile của tôi
  updateMyProfile: (data: UpdateUserRequest) =>
    axiosInstance.put<UserResponse>(`${API_CONFIG.ENDPOINTS.USERS}/me`, data),

  // Đổi mật khẩu
  changePassword: (data: ChangePasswordRequest) =>
    axiosInstance.put(`${API_CONFIG.ENDPOINTS.USERS}/change-password`, data),

  // Upload avatar
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post<{avatarUrl: string}>(`${API_CONFIG.ENDPOINTS.USERS}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export default userApi