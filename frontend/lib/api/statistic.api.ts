import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { HotelStatisticRequest, HotelStatisticResponse } from '@/types/statistic.types'

const statisticApi = {
    /**
     * Lấy thống kê khách sạn theo khoảng thời gian
     * @param params bao gồm hotelId, fromDate, toDate
     */
    getStats: (params: HotelStatisticRequest) =>
        axiosInstance.get<HotelStatisticResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_STATISTICS, {
            params,
        }),
}

export default statisticApi