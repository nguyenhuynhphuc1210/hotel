import { useQuery } from '@tanstack/react-query'
import paymentApi from '@/lib/api/payment.api'

export const usePayments = (page: number, size: number) => {
  return useQuery({
    queryKey: ['admin-payments', page, size],
    queryFn: () => paymentApi.getAll(page, size).then(res => res.data),
  })
}