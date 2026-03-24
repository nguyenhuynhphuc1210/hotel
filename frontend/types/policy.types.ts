export interface HotelPolicyResponse {
  id: number
  hotelId: number
  checkInTime: string
  checkOutTime: string
  cancellationPolicy: string
  childrenPolicy: string
  petPolicy: string
  createdAt: string
  updatedAt: string
}

export interface HotelPolicyRequest {
  hotelId: number
  checkInTime: string
  checkOutTime: string
  cancellationPolicy: string
  childrenPolicy: string
  petPolicy: string
}