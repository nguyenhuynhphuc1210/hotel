// ── Request types ──────────────────────────────────────
export interface HotelStatisticRequest {
  hotelId: number;
  day?: number;
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
}

export interface DashboardParams {
  hotelId?: number;
  ownerId?: number;
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
}

export interface DailyStatisticResponse {
  statDate: string;
  completedBookings: number | null;
  totalCancelled: number | null;
  totalNoShow: number | null;
  grossRevenue: number | null;
  totalCommission: number | null;
  netRevenue: number | null;
  systemSponsorAmount: number | null; 
  platformNetProfit: number | null;   
}

export interface DashboardSummaryResponse {
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  grossRevenue: number;
  totalCommission: number;
  netRevenue: number;
  systemSponsorAmount: number; 
  platformNetProfit: number;   
}

export interface HotelStatisticSummaryResponse {
  hotelId: number;
  hotelName: string;
  completedBookings: number | null;
  totalCancelled: number | null;
  totalNoShow: number | null;
  grossRevenue: number | null;
  totalCommission: number | null;
  systemSponsorAmount: number | null; 
  platformNetProfit: number | null;   
  netRevenue: number | null;
}

export interface SystemStatisticSummary {
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  grossRevenue: number;
  totalCommission: number;
  netRevenue: number;
  systemSponsorAmount: number;
  platformNetProfit: number;
}

export interface HotelStatisticResponse {
  id: number;
  hotelId: number;
  statDate: string;
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  grossRevenue: number;
  totalCommission: number;
  netRevenue: number;
  systemSponsorAmount: number; 
  platformNetProfit: number;
}

export interface RecentBookingResponse {
  bookingId: number;
  bookingCode: string;
  guestName: string;
  hotelName: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  commissionAmount: number; 
  netAmount: number;
}

export interface DashboardResponse {
  summary: DashboardSummaryResponse;
  topHotels: HotelStatisticSummaryResponse[];
  chartData: DailyStatisticResponse[];
  recentBookings: RecentBookingResponse[];
  totalHotels?: number | null;
  totalUsers?: number | null;
  totalBookings?: number | null;
}