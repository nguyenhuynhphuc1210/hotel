// components/providers/AuthProvider.tsx
'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api' 
import axios from 'axios'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, setUser } = useAuthStore()

  useEffect(() => {
    // Chỉ validate nếu thực sự có token trong store
    if (!token) return

    const validateToken = async () => {
      try {
        const response = await userApi.getMyProfile()
        setUser(response.data)
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          // Chỉ xóa auth nếu server thực sự từ chối token (401, 403)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn("Phiên đăng nhập hết hạn.");
            clearAuth()
            // Đừng dùng window.location.href = '/login' ở đây 
            // vì nó sẽ ép người dùng login ngay cả khi họ đang xem trang public
          }
        }
      }
    }

    validateToken()
  }, [token, clearAuth, setUser])

  return <>{children}</>
}