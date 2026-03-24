// Khớp AmenityResponse.java
export interface AmenityResponse {
  id: number
  amenityName: string
  iconUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AmenityRequest {
  amenityName: string
  iconUrl?: string
}

// Khớp HotelAmenityResponse.java
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