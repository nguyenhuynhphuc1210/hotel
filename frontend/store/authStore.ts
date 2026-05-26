'use client'

import { create } from 'zustand'
import { UserResponse } from '@/types/auth.types'

interface AuthState {
    token: string | null
    user: UserResponse | null
    isAuthenticated: boolean
    isLoading: boolean
    hasHydrated: boolean

    hydrate: () => void

    setAuth: (token: string, user: UserResponse) => void
    setUser: (user: UserResponse | null) => void
    clearAuth: () => void
    logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    // SSR SAFE
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    hasHydrated: false,

    hydrate: () => {
        if (typeof window === 'undefined') return

        try {
            const token = localStorage.getItem('access_token')

            const rawUser = localStorage.getItem('user')

            const user = rawUser
                ? JSON.parse(rawUser)
                : null

            set({
                token,
                user,
                isAuthenticated: !!token,
                hasHydrated: true,
            })
        } catch {
            set({
                hasHydrated: true,
            })
        }
    },

    setAuth: (token, user) => {
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify(user))

        const maxAge = 30 * 24 * 60 * 60

        document.cookie =
            `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict`

        document.cookie =
            `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${maxAge}; SameSite=Strict`

        set({
            token,
            user,
            isAuthenticated: true,
        })
    },

    setUser: (user) => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user))

            document.cookie =
                `user=${encodeURIComponent(JSON.stringify(user))}; path=/; SameSite=Strict`
        } else {
            localStorage.removeItem('user')

            document.cookie =
                'user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
        }

        set({ user })
    },

    clearAuth: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')

        document.cookie =
            'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'

        document.cookie =
            'user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'

        set({
            token: null,
            user: null,
            isAuthenticated: false,
        })
    },

    logout: () => {
        const { clearAuth } = useAuthStore.getState()

        clearAuth()
    },
}))