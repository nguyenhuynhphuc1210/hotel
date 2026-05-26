import { useQuery } from '@tanstack/react-query'
import statisticApi from '@/lib/api/statistic.api'
import { HotelStatisticRequest } from '@/types/statistic.types'

export const useHotelStatistics = (params: HotelStatisticRequest, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['hotel-statistics', params.hotelId, params.fromDate, params.toDate],
    queryFn: () => statisticApi.getStats(params).then(res => res.data),
    enabled: enabled && !!params.hotelId && !!params.fromDate && !!params.toDate,
  })
}