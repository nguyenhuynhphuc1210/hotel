import { useQuery } from '@tanstack/react-query'
import paymentApi from '@/lib/api/payment.api'

export const usePayments = (
  page: number, 
  size: number, 
  filters: {
    search?: string;
    status?: string;
    method?: string,
    hotelId?: number | null;
    ownerId?: number | null;
  }
) => {
  return useQuery({
    queryKey: ['admin-payments', page, size, ...Object.values(filters)], 
    queryFn: () => paymentApi.getAll(
      page, 
      size, 
      filters.search, 
      filters.status,
      filters.method, 
      filters.hotelId, 
      filters.ownerId
    ).then(res => res.data),
  })
}