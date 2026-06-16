'use client'

import React, { createContext, useContext, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import hotelApi, { HotelResponse, PageResponse } from '@/lib/api/hotel.api'

interface OwnerHotelContextType {
  hotels: HotelResponse[] 
  activeHotel: HotelResponse | null
  activeHotelId: number | null
  setActiveHotelId: (id: number) => void
  isLoading: boolean
}

const OwnerHotelContext = createContext<OwnerHotelContextType | undefined>(undefined)

export function OwnerHotelProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  
  const { data: hotelsData, isLoading: isLoadingList } = useQuery({
    queryKey: ['owner-hotels-list'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  
  const hotelList = useMemo(() => {
    if (!hotelsData) return []
    if (Array.isArray(hotelsData)) return hotelsData
    
    return (hotelsData as PageResponse<HotelResponse>).content || []
  }, [hotelsData])

  
  const activeHotelId = useMemo(() => {
    if (selectedId) return selectedId
    return hotelList.length > 0 ? hotelList[0].id : null
  }, [selectedId, hotelList])

  
  const { data: activeHotelDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['owner-hotel-detail', activeHotelId],
    queryFn: () => activeHotelId ? hotelApi.getById(activeHotelId).then(r => r.data) : null,
    enabled: !!activeHotelId, 
  })

  return (
    <OwnerHotelContext.Provider value={{ 
      hotels: hotelList, 
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