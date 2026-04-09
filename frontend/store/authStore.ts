'use client'

import { create } from 'zustand'
import { UserResponse } from '@/types/auth.types'

interface AuthState {
  token: string | null
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (token: string, user: UserResponse) => void
  // Thêm hàm setUser vào interface
  setUser: (user: UserResponse | null) => void 
  clearAuth: () => void
  logout: () => void
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function getStoredUser(): UserResponse | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false, 

  setAuth: (token, user) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))    
    
    const maxAge = 30 * 24 * 60 * 60; 
    document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict`
    document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${maxAge}; SameSite=Strict`
    
    set({ token, user, isAuthenticated: true })
  },

  // --- HÀM CẬP NHẬT THÔNG TIN USER (Đã fix lỗi Implicit Any) ---
  setUser: (user: UserResponse | null) => {
    if (user) {
      // Cập nhật LocalStorage
      localStorage.setItem('user', JSON.stringify(user))
      // Cập nhật Cookie
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; SameSite=Strict`
    } else {
      localStorage.removeItem('user')
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    }
    
    // Cập nhật trạng thái trong Zustand
    set({ user })
  },

   clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    set({ token: null, user: null, isAuthenticated: false })
  },
  
  logout: () => {    
    const { clearAuth } = useAuthStore.getState();
    clearAuth();
  }
}))