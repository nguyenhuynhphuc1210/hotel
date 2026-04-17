export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'CHECKED_IN' | 'NO_SHOW'

export interface BookingResponse {
  id: number
  bookingCode: string
  userId: number | null
  userEmail: string | null
  guestEmail: string
  guestName: string
  guestPhone: string
  hotelId: number
  hotelName: string
  hotelAddress: string
  hotelPhone: string
  checkInDate: string
  checkOutDate: string
  status: BookingStatus
  subtotal: number
  discountAmount: number | null
  promotionId: number | null
  promoCode: string | null
  totalAmount: number
  paymentMethod: string | null 
  paymentStatus: string | null
  paymentUrl: string | null
  createdAt: string
  updatedAt: string
  bookingRooms: BookingRoomResponse[]
  reviewed?: boolean
}

export interface BookingRoomRateResponse {
  id: number
  bookingRoomId: number
  roomTypeId: number
  date: string      
  price: number
}

export interface BookingRoomResponse {
  id: number
  bookingId: number
  roomTypeId: number
  roomTypeName: string
  quantity: number
  pricePerNight: number
  rates: BookingRoomRateResponse[]   
}

export interface BookingRequest {
  hotelId: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string; 
  checkOutDate: string; 
  promotionId?: number;
  paymentMethod: string;
  bookingRooms: { roomTypeId: number; quantity: number }[];
}

