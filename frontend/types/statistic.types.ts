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

// ── Response types ──────────────────────────────────────

// Tương ứng với DailyStatisticResponse.java
export interface DailyStatisticResponse {
  statDate: string;
  completedBookings: number | null;
  totalCancelled: number | null;
  totalNoShow: number | null;
  grossRevenue: number | null;
  totalCommission: number | null;
  netRevenue: number | null;
  systemSponsorAmount: number | null; // Mới
  platformNetProfit: number | null;   // Mới
}

// Tương ứng với DashboardSummaryResponse.java
export interface DashboardSummaryResponse {
  completedBookings: number;
  totalCancelled: number;
  totalNoShow: number;
  grossRevenue: number;
  totalCommission: number;
  netRevenue: number;
  systemSponsorAmount: number; // Mới
  platformNetProfit: number;   // Mới
}

export interface HotelStatisticSummaryResponse {
  hotelId: number;
  hotelName: string;
  completedBookings: number | null;
  totalCancelled: number | null;
  totalNoShow: number | null;
  grossRevenue: number | null;
  totalCommission: number | null;
  systemSponsorAmount: number | null; // Mới
  platformNetProfit: number | null;   // Mới
  netRevenue: number | null;
}

// Tương ứng với SystemStatisticSummary.java
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

// Interface cũ của bạn (cập nhật thêm field cho đồng bộ nếu cần)
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
  // Admin-only fields
  totalHotels?: number | null;
  totalUsers?: number | null;
  totalBookings?: number | null;
}