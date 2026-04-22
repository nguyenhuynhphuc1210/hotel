import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { LoginRequest, AuthResponse, RegisterRequest } from '@/types/auth.types'

const authApi = {
  // POST /api/auth/login
  login: (data: LoginRequest) =>
    axiosInstance.post<AuthResponse>(API_CONFIG.ENDPOINTS.LOGIN, data),

  register: (data: RegisterRequest) =>
    axiosInstance.post(API_CONFIG.ENDPOINTS.REGISTER, data),

  forgotPassword: (email: string) =>
    axiosInstance.post(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, { email }),

  verifyOtp: (email: string, otp: string) =>
    axiosInstance.post(API_CONFIG.ENDPOINTS.VERIFY_OTP, { email, otp }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    axiosInstance.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, { email, otp, newPassword }),

  loginWithGoogle: (idToken: string) =>
    axiosInstance.post<AuthResponse>(API_CONFIG.ENDPOINTS.GOOGLE_LOGIN, { idToken }),

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },

}

export default authApi