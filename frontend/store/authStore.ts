import { create } from 'zustand'
import { UserResponse } from '@/types/auth.types'

interface AuthState {
    token: string | null
    user: UserResponse | null
    isAuthenticated: boolean

    setAuth: (token: string, user: UserResponse) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isAuthenticated: false,

    // Gọi sau khi login thành công
    setAuth: (token, user) => {
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify(user))

        // Lưu cả 2 cookie — token và user
        document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`
        document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7 * 24 * 60 * 60}`

        set({ token, user, isAuthenticated: true })
    },

    clearAuth: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        document.cookie = 'access_token=; path=/; max-age=0'
        document.cookie = 'user=; path=/; max-age=0'
        set({ token: null, user: null, isAuthenticated: false })
    },
}))