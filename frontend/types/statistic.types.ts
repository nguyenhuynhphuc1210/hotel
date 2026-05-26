export interface HotelStatisticRequest {
  hotelId: number;
  fromDate: string; 
  toDate: string;  
}

export interface HotelStatisticResponse {
  id: number;
  hotelId: number;
  statDate: string;
  totalBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  totalRevenue: number;
  grossBookings: number; 
}