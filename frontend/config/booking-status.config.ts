import { CheckCircle, XCircle, Clock, LogIn, Ban } from 'lucide-react'
import type { BookingStatus } from '@/types/booking.types'

// ─── 1. Status display config ─────────────────────────────────────────────────

export const BOOKING_STATUS_CONFIG: Record<
    BookingStatus,
    { label: string; class: string; icon: React.ElementType }
> = {
    PENDING: { label: 'Chờ xác nhận', class: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
    CONFIRMED: { label: 'Đã xác nhận', class: 'bg-blue-50 text-blue-700 border border-blue-200', icon: CheckCircle },
    CHECKED_IN: { label: 'Đã nhận phòng', class: 'bg-indigo-50 text-indigo-700 border border-indigo-200', icon: LogIn },
    COMPLETED: { label: 'Hoàn thành', class: 'bg-green-50 text-green-700 border border-green-200', icon: CheckCircle },
    CANCELLED: { label: 'Đã huỷ', class: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
    NO_SHOW: { label: 'Không đến', class: 'bg-gray-100 text-gray-500 border border-gray-200', icon: Ban },
}

// ─── 2. Transition rules ──────────────────────────────────────────────────────

export const BOOKING_STATUS_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
    CHECKED_IN: ['COMPLETED'],
}

export const BOOKING_TRANSITION_LABELS: Partial<Record<BookingStatus, string>> = {
    CONFIRMED: 'Xác nhận đặt phòng',
    CHECKED_IN: 'Check-in khách',
    COMPLETED: 'Check-out / Hoàn thành',
    CANCELLED: 'Huỷ đơn',
    NO_SHOW: 'Đánh dấu no-show',
}

// ─── 3. Stat tab order ────────────────────────────────────────────────────────

export const BOOKING_STAT_STATUSES: BookingStatus[] = [
    'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
]

// ─── 4. Payment configs (gộp luôn cho tiện) ──────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
    CREDIT_CARD: 'Thẻ tín dụng',
    MOMO: 'MoMo',
    VNPAY: 'VNPay',
    ZALOPAY: 'ZaloPay',
}

export const PAYMENT_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
    PENDING: { label: 'Chờ TT', class: 'bg-amber-50 text-amber-600' },
    UNPAID: { label: 'Chưa TT', class: 'bg-gray-100 text-gray-500' },
    PAID: { label: 'Đã TT', class: 'bg-green-50 text-green-700' },
    FAILED: { label: 'Thất bại', class: 'bg-red-50 text-red-600' },
    REFUNDED: { label: 'Hoàn tiền', class: 'bg-purple-50 text-purple-700' },
    CANCELLED: { label: 'Đã huỷ', class: 'bg-red-50 text-red-400' },
}