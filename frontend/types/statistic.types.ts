export interface HotelStatisticRequest {
  hotelId: number
  fromDate?: string
  toDate?: string
  day?: number
  month?: number
  year?: number
}

export interface HotelStatisticResponse {
  id: number
  hotelId: number
  statDate: string         
  completedBookings: number 
  totalCancelled: number   
  totalNoShow: number       
  totalRevenue: number      
}