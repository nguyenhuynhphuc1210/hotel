import bookingApi from "@/lib/api/booking.api";
import { useQuery } from "@tanstack/react-query";

export const useAdminBookings = (
  page: number,
  size: number,
  params?: { keyword?: string; status?: string; hotelId?: number; ownerId?: number }
) =>
  useQuery({
    queryKey: ['admin-bookings', page, size, params],
    queryFn: () => bookingApi.getAll(page, size, params).then(r => r.data),
  })