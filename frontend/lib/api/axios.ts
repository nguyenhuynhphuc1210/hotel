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
      // 1. Luôn luôn xoá session/cookie khi token hỏng
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      const path = window.location.pathname
      
      // 2. CHỈ REDIRECT nếu người dùng đang ở trang yêu cầu quyền (Private Routes)
      const protectedPaths = ['/admin', '/owner', '/profile', '/booking', '/user']
      const isProtectedPath = protectedPaths.some(p => path.startsWith(p))

      if (isProtectedPath) {
        if (path.startsWith('/admin') || path.startsWith('/owner')) {
          window.location.href = '/admin/login'
        } else {
          window.location.href = '/login'
        }
      } 
      // Nếu là trang public (như /hotels), chúng ta chỉ xoá token 
      // để UI hiển thị trạng thái "Chưa đăng nhập", KHÔNG redirect.
    }
    return Promise.reject(error)
  }
)

export default axiosInstance