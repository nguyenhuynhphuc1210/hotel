import bookingApi from "@/lib/api/booking.api";
import { useQuery } from "@tanstack/react-query";


export const useAdminBookings = (page = 0, size = 10) =>
  useQuery({
    queryKey: ['admin-bookings', page, size],
    queryFn: () => bookingApi.getAll(page, size).then(r => r.data),
  })