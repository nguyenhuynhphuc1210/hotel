import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'

const favoriteApi = {
  toggle: (hotelId: number) =>
    axiosInstance.post<{ isFavorited: boolean }>(API_CONFIG.ENDPOINTS.FAVORITES_TOGGLE(hotelId)),
  getMyFavorites: (page = 0, size = 10) =>
    axiosInstance.get(API_CONFIG.ENDPOINTS.FAVORITES_MY, { params: { page, size } }),
}
export default favoriteApi