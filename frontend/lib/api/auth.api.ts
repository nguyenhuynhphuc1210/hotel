import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { LoginRequest, AuthResponse } from '@/types/auth.types'

const authApi = {
  // POST /api/auth/login
  login: (data: LoginRequest) =>
    axiosInstance.post<AuthResponse>(API_CONFIG.ENDPOINTS.LOGIN, data),

  // POST /api/auth/logout (chỉ xoá token phía FE, BE stateless)
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },
}

export default authApi