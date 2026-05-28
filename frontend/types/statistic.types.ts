import { BookingStatus } from './booking.types';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface DashboardSummaryResponse {
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  totalRevenue: number;
}

export interface DailyStatisticResponse {
  statDate: string; 
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  totalRevenue: number;
}

export interface HotelStatisticSummaryResponse {
  hotelId: number;
  hotelName: string;
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  totalRevenue: number;
}

export interface RecentBookingResponse {
  bookingId: number;
  bookingCode: string;
  guestName: string;
  hotelName: string;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  checkInDate: string;   // LocalDate
  checkOutDate: string;  // LocalDate
  createdAt: string;     // LocalDateTime -> "yyyy-MM-ddTHH:mm:ss"
}

export interface DashboardResponse {
  summary: DashboardSummaryResponse;
  totalHotels?: number;   // Dùng optional vì @JsonInclude(NON_NULL)
  totalUsers?: number;
  totalBookings?: number;
  chartData: DailyStatisticResponse[];
  topHotels: HotelStatisticSummaryResponse[];
  recentBookings: RecentBookingResponse[];
}

export interface DashboardParams {
  hotelId?: number;
  ownerId?: number;
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
}

export interface HotelStatisticRequest {
  hotelId: number;
  fromDate?: string;
  toDate?: string;
  day?: number;
  month?: number;
  year?: number;
}

export interface HotelStatisticResponse {
  id: number;
  hotelId: number;
  statDate: string;
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  totalRevenue: number;
}