'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function useLogout() {
  const router    = useRouter()
  const clearAuth = useAuthStore(s => s.clearAuth)

  const logout = (redirectTo = '/login') => {
    clearAuth()
    router.push(redirectTo)
  }

  return { logout }
}