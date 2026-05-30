// ── Request types ──────────────────────────────────────
export interface HotelStatisticRequest {
  hotelId: number
  day?: number
  month?: number
  year?: number
  fromDate?: string
  toDate?: string
}

export interface DashboardParams {
  hotelId?: number
  ownerId?: number
  month?: number
  year?: number
  fromDate?: string
  toDate?: string
}

// ── Response types ──────────────────────────────────────
export interface HotelStatisticResponse {
  id: number
  hotelId: number
  hotelName: string
  statDate: string
  completedBookings: number
  totalRevenue: number
  totalCancelled: number
  totalNoShow: number
}

export interface HotelStatisticSummaryResponse {
  hotelId: number
  hotelName: string
  completedBookings: number | null
  totalRevenue: number | null
  totalCancelled: number | null
  totalNoShow: number | null
}

export interface DailyStatisticResponse {
  statDate: string
  completedBookings: number | null
  totalRevenue: number | null
  totalCancelled: number | null
  totalNoShow: number | null
}

export interface DashboardSummaryResponse {
  completedBookings: number
  totalCancelled: number
  totalNoShow: number
  totalRevenue: number
}

export interface RecentBookingResponse {
  bookingId: number
  bookingCode: string
  guestName: string
  hotelName: string
  totalAmount: number
  status: string
  paymentStatus: string
  checkInDate: string
  checkOutDate: string
  createdAt: string
}

export interface DashboardResponse {
  summary: DashboardSummaryResponse
  topHotels: HotelStatisticSummaryResponse[]
  chartData: DailyStatisticResponse[]
  recentBookings: RecentBookingResponse[]
  // Admin-only fields
  totalHotels?: number | null
  totalUsers?: number | null
  totalBookings?: number | null
}