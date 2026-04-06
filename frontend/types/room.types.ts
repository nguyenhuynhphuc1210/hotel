export interface RoomImageResponse {
  id: number
  imageUrl: string
  isPrimary: boolean
  publicId: string
}

export interface RoomTypeResponse {
  id: number
  hotelId: number
  hotelName: string
  typeName: string
  description: string | null
  maxAdults: number | null
  maxChildren: number | null
  bedType: string | null
  roomSize: number | null
  basePrice: number
  totalRooms: number | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
  checkIn: string | null
  checkOut: string | null
  thumbnailUrl?: string;
  images?: RoomImageResponse[]
}

export interface RoomTypeRequest {
  hotelId: number
  typeName: string
  description?: string
  maxAdults?: number
  maxChildren?: number
  bedType?: string
  roomSize?: number
  basePrice: number
  totalRooms: number
}