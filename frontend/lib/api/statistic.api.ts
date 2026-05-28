import axiosInstance from './axios';
import API_CONFIG from '@/config/api.config';
import { 
  HotelStatisticRequest, 
  HotelStatisticResponse, 
  DashboardResponse, 
  DashboardParams 
} from '@/types/statistic.types';

const statisticApi = {
    
    getStats: (params: HotelStatisticRequest) =>
        axiosInstance.get<HotelStatisticResponse[]>(API_CONFIG.ENDPOINTS.HOTEL_STATISTICS, {
            params,
        }),

    getDashboard: (params: DashboardParams) =>
        axiosInstance.get<DashboardResponse>(`${API_CONFIG.ENDPOINTS.HOTEL_STATISTICS}/dashboard`, {
            params,
        }),
};

export default statisticApi;