export interface HotelStatisticResponse {
  id: number
  hotelId: number
  statDate: string
  totalBookings: number | null
  totalRevenue: number | null
}