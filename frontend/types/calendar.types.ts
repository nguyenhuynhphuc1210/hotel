export interface RoomCalendarResponse {
  id: number
  roomTypeId: number
  date: string
  price: number
  totalRooms: number
  bookedRooms: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateCalendarRequest {
  startDate: string
  endDate: string
  price: number
  totalRooms: number
  isAvailable: boolean
}