'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import AuthProvider from './providers/AuthProvider' // Import AuthProvider của bạn

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {/* Bọc AuthProvider quanh children để kiểm tra token ngay khi app load */}
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: '14px',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}