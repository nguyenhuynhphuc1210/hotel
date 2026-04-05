import { BOOKING_STATUS_CONFIG } from '@/config/booking-status.config'
import type { BookingStatus } from '@/types/booking.types'

interface Props {
  status: BookingStatus
  showIcon?: boolean
}

export function BookingStatusBadge({ status, showIcon = true }: Props) {
  const { label, class: cls, icon: Icon } = BOOKING_STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>
      {showIcon && <Icon size={11} />}
      {label}
    </span>
  )
}