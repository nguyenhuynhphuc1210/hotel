import axios from 'axios'
import API_CONFIG from '@/config/api.config'

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Request interceptor: gắn token từ sessionStorage ──
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: xử lý 401 ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Xoá session
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      // Redirect về đúng trang login
      const path = window.location.pathname
      if (path.startsWith('/admin') || path.startsWith('/owner')) {
        window.location.href = '/admin/login'
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance