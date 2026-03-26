// Khớp với BookingStatus enum trong BE
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

// Khớp với BookingResponse.java
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
  paymentUrl: string | null
  createdAt: string
  updatedAt: string
  bookingRooms: BookingRoomResponse[]
}

export interface BookingRoomResponse {
  id: number
  roomTypeId: number
  roomTypeName: string
  quantity: number
  pricePerNight: number
}

export interface BookingRequest {
  hotelId: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string; // ISO Date string
  checkOutDate: string; // ISO Date string
  promotionId?: number;
  paymentMethod: string;
  bookingRooms: { roomTypeId: number; quantity: number }[];
}