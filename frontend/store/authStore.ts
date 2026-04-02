import { create } from 'zustand'
import { UserResponse } from '@/types/auth.types'

interface AuthState {
  token: string | null
  user: UserResponse | null
  isAuthenticated: boolean
  setAuth: (token: string, user: UserResponse) => void
  clearAuth: () => void
  isLoading: boolean
  logout: () => void
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')  // ← đổi sessionStorage → localStorage
}

function getStoredUser(): UserResponse | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')   // ← đổi sessionStorage → localStorage
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
    document.cookie = `access_token=${token}; path=/; SameSite=Strict`
    document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; SameSite=Strict`
    set({ token, user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    set({ token: null, user: null, isAuthenticated: false })
  },
  
  
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    set({ token: null, user: null, isAuthenticated: false })
  }
}))