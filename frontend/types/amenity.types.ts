export type AmenityType = 'HOTEL' | 'ROOM'

export interface AmenityResponse {
  id: number
  amenityName: string
  iconUrl: string | null
  type: AmenityType
  createdAt: string
  updatedAt: string
}
 
export interface AmenityRequest {
  amenityName: string
  iconUrl?: string
  type: AmenityType
}

export interface HotelAmenityResponse {
  hotelId: number
  hotelName: string
  amenityId: number
  amenityName: string
  isFree: boolean
  additionalFee: number
}

export interface HotelAmenityRequest {
  hotelId: number
  amenityId: number
  isFree: boolean
  additionalFee?: number
}

export interface RoomTypeAmenityResponse {
  roomTypeId: number
  roomTypeName: string
  amenityId: number
  amenityName: string
  iconUrl: string | null
  isFree: boolean
  additionalFee: number
}
 
export interface RoomTypeAmenityRequest {
  roomTypeId: number
  amenityId: number
  isFree: boolean
  additionalFee?: number
}