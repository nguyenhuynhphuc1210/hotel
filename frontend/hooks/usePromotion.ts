import { useQuery } from '@tanstack/react-query'
import promotionApi from '@/lib/api/promotion.api'

export const usePromotions = () =>
  useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionApi.getAll().then(r => r.data),
  })

export const useActivePromotions = () =>
  useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: async () => {
      const data = await promotionApi.getAll().then(r => r.data)
      const now = new Date()
      return data.filter(p =>
        p.isActive &&
        new Date(p.startDate) <= now &&
        new Date(p.endDate) >= now
      )
    },
  })