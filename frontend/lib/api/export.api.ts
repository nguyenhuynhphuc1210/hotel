import axiosInstance from '@/lib/api/axios'
import { BookingStatus } from '@/types/booking.types'
import { PaymentMethod, PaymentStatus } from '@/types/payment.types'

/**
 * Tải file blob về máy người dùng
 */
function downloadBlob(data: BlobPart, filename: string, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface BookingExportParams {
  keyword?: string
  status?: BookingStatus | ''
  hotelId?: number | ''
  ownerId?: number
}

export async function exportBookings(params: BookingExportParams = {}): Promise<void> {
  const { data } = await axiosInstance.get('/api/bookings/export', {
    params: {
      keyword: params.keyword || undefined,
      status: params.status || undefined,
      hotelId: params.hotelId || undefined,
      ownerId: params.ownerId || undefined,
    },
    responseType: 'arraybuffer',
  })
  downloadBlob(data, 'bookings.xlsx')
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface PaymentExportParams {
  keyword?: string
  status?: PaymentStatus | ''
  method?: PaymentMethod | ''
  hotelId?: number | null
  ownerId?: number
}

export async function exportPayments(params: PaymentExportParams = {}): Promise<void> {
  const { data } = await axiosInstance.get('/api/payments/export', {
    params: {
      keyword: params.keyword || undefined,
      status: params.status || undefined,
      method: params.method || undefined,
      hotelId: params.hotelId || undefined,
      ownerId: params.ownerId || undefined,
    },
    responseType: 'arraybuffer',
  })
  downloadBlob(data, 'payments.xlsx')
}

// ─── Revenue / Statistics ─────────────────────────────────────────────────────

export interface RevenueExportParams {
  hotelId?: number | null
  ownerId?: number
  month?: number
  year?: number
  fromDate?: string
  toDate?: string
}

export async function exportRevenue(params: RevenueExportParams = {}): Promise<void> {
  const { data } = await axiosInstance.get('/api/statistics/export', {
    params: {
      hotelId: params.hotelId || undefined,
      ownerId: params.ownerId || undefined,
      month: params.month || undefined,
      year: params.year || undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
    },
    responseType: 'arraybuffer',
  })
  downloadBlob(data, 'revenue.xlsx')
}