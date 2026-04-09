'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api' 
import axios from 'axios'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, setUser } = useAuthStore()

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return

      try {
        // SỬA TẠI ĐÂY: Dùng hàm đã viết sẵn trong userApi
        const response = await userApi.getMyProfile()
        
        // Cập nhật lại thông tin user mới nhất
        setUser(response.data)
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          // Nếu lỗi 401 (hết hạn) hoặc 403 (không quyền) hoặc thậm chí 500 (lỗi nặng)
          // thì nên xóa auth để user đăng nhập lại
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn("Phiên đăng nhập không hợp lệ, đang đăng xuất...");
            clearAuth()
          }
        } else {
          console.error("Lỗi xác thực:", error);
        }
      }
    }

    validateToken()
  }, [token, clearAuth, setUser])

  return <>{children}</>
}