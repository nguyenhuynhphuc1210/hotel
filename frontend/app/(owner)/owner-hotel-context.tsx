// @/app/(owner)/owner-hotel-context.tsx
'use client'

import React, { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import hotelApi, { HotelResponse } from '@/lib/api/hotel.api'

interface OwnerHotelContextType {
  hotels: HotelResponse[]
  activeHotel: HotelResponse | null
  activeHotelId: number | null
  setActiveHotelId: (id: number) => void
  isLoading: boolean
}

const OwnerHotelContext = createContext<OwnerHotelContextType | undefined>(undefined)

export function OwnerHotelProvider({ children }: { children: React.ReactNode }) {
  // 1. Chỉ lưu ID khi người dùng "chủ động" chọn từ dropdown
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ['owner-hotels-global'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  // 2. TÍNH TOÁN activeHotelId trực tiếp (Derived State)
  // Nếu người dùng đã chọn (selectedId), dùng nó. 
  // Nếu chưa chọn (mới load trang), mặc định lấy id của khách sạn đầu tiên.
  const activeHotelId = selectedId || (hotels.length > 0 ? hotels[0].id : null)

  // 3. Tìm object hotel tương ứng
  const activeHotel = hotels.find(h => h.id === activeHotelId) || null

  return (
    <OwnerHotelContext.Provider value={{ 
      hotels, 
      activeHotel, 
      activeHotelId, 
      setActiveHotelId: setSelectedId, // Hàm này giờ sẽ cập nhật selectedId
      isLoading 
    }}>
      {children}
    </OwnerHotelContext.Provider>
  )
}

export const useOwnerHotel = () => {
  const context = useContext(OwnerHotelContext)
  if (!context) throw new Error('useOwnerHotel must be used within OwnerHotelProvider')
  return context
}