export interface ReviewRequest {
  bookingId: number
  rating: number 
  comment: string
}

export interface ReviewResponse {
  id: number
  bookingId: number
  userId: number
  userName: string
  hotelId: number
  hotelName: string
  rating: number
  comment: string | null
  isPublished: boolean
  createdAt: string 
}