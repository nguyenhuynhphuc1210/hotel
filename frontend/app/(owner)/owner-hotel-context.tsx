'use client'

import React, { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import hotelApi, { HotelResponse } from '@/lib/api/hotel.api'

interface OwnerHotelContextType {
  // Thay any[] bằng HotelResponse[] để hết lỗi ESLint
  hotels: HotelResponse[] 
  activeHotel: HotelResponse | null
  activeHotelId: number | null
  setActiveHotelId: (id: number) => void
  isLoading: boolean
}

const OwnerHotelContext = createContext<OwnerHotelContextType | undefined>(undefined)

export function OwnerHotelProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 1. Lấy danh sách (Có thể thiếu trường images do Backend trả về Summary)
  const { data: hotels = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['owner-hotels-list'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  const activeHotelId = selectedId || (hotels.length > 0 ? hotels[0].id : null)

  // 2. Lấy chi tiết (Chắc chắn có trường images vì dùng API getById)
  const { data: activeHotelDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['owner-hotel-detail', activeHotelId],
    queryFn: () => activeHotelId ? hotelApi.getById(activeHotelId).then(r => r.data) : null,
    enabled: !!activeHotelId, 
  })

  return (
    <OwnerHotelContext.Provider value={{ 
      hotels, 
      activeHotel: activeHotelDetail || null, 
      activeHotelId, 
      setActiveHotelId: setSelectedId,
      isLoading: isLoadingList || isLoadingDetail 
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