'use client'

import React, { createContext, useContext, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import hotelApi, { HotelResponse, PageResponse } from '@/lib/api/hotel.api'

interface OwnerHotelContextType {
  hotels: HotelResponse[] // Chúng ta sẽ trả về mảng đã trích xuất để các trang khác dễ dùng
  activeHotel: HotelResponse | null
  activeHotelId: number | null
  setActiveHotelId: (id: number) => void
  isLoading: boolean
}

const OwnerHotelContext = createContext<OwnerHotelContextType | undefined>(undefined)

export function OwnerHotelProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 1. Lấy danh sách khách sạn của Owner
  const { data: hotelsData, isLoading: isLoadingList } = useQuery({
    queryKey: ['owner-hotels-list'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  // ✅ FIX: Trích xuất mảng khách sạn từ đối tượng PageResponse
  const hotelList = useMemo(() => {
    if (!hotelsData) return []
    if (Array.isArray(hotelsData)) return hotelsData
    // Nếu là PageResponse từ Spring Boot, lấy thuộc tính .content
    return (hotelsData as PageResponse<HotelResponse>).content || []
  }, [hotelsData])

  // Xác định ID khách sạn đang hoạt động (ưu tiên cái được chọn, nếu không lấy cái đầu tiên)
  const activeHotelId = useMemo(() => {
    if (selectedId) return selectedId
    return hotelList.length > 0 ? hotelList[0].id : null
  }, [selectedId, hotelList])

  // 2. Lấy chi tiết khách sạn đang chọn
  const { data: activeHotelDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['owner-hotel-detail', activeHotelId],
    queryFn: () => activeHotelId ? hotelApi.getById(activeHotelId).then(r => r.data) : null,
    enabled: !!activeHotelId, 
  })

  return (
    <OwnerHotelContext.Provider value={{ 
      hotels: hotelList, // Trả về mảng sạch (không còn là Page object)
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