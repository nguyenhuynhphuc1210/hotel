import { useQuery } from '@tanstack/react-query'
import paymentApi from '@/lib/api/payment.api'

export const usePayments = (
  page: number, 
  size: number, 
  search?: string,   
  status?: string    
) => {
  return useQuery({
    
    queryKey: ['admin-payments', page, size, search, status], 
    queryFn: () => paymentApi.getAll(page, size, search, status).then(res => res.data),
  })
}