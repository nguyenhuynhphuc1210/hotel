'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api' 
import axios from 'axios'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, setUser } = useAuthStore()

  useEffect(() => {
    
    if (!token) return

    const validateToken = async () => {
      try {
        const response = await userApi.getMyProfile()
        setUser(response.data)
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn("Phiên đăng nhập hết hạn.");
            clearAuth()
            
            
          }
        }
      }
    }

    validateToken()
  }, [token, clearAuth, setUser])

  return <>{children}</>
}