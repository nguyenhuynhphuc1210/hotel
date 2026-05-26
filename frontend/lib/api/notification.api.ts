import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'
import { PageResponse } from './hotel.api'
import { NotificationResponse } from '@/types/notification.types'

const notificationApi = {

  getMyNotifications: (page = 0, size = 20) =>
    axiosInstance.get<PageResponse<NotificationResponse>>(
      API_CONFIG.ENDPOINTS.NOTIFICATIONS,
      {
        params: { page, size }
      }
    ),

  getUnreadCount: () =>
    axiosInstance.get<{ unreadCount: number }>(
      `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/unread-count`
    ),

  markAllAsRead: () =>
    axiosInstance.patch<{ updatedCount: number }>(
      `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/read-all`
    ),

  markAsRead: (id: number | string) =>
    axiosInstance.patch(
      `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${id}/read`
    ),
}

export default notificationApi