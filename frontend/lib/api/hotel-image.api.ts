import axiosInstance from './axios'
import API_CONFIG from '@/config/api.config'

const hotelImageApi = {
  // Upload nhiều ảnh
  upload: (hotelId: number, files: File[]) => {
    const form = new FormData()
    form.append('hotelId', String(hotelId))
    files.forEach(f => form.append('files', f))
    return axiosInstance.post<string[]>(
      API_CONFIG.ENDPOINTS.HOTEL_IMAGES_UPLOAD,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  // Xoá ảnh theo publicId
  delete: (publicId: string) =>
    axiosInstance.delete(API_CONFIG.ENDPOINTS.HOTEL_IMAGES_DELETE, {
      params: { publicId }
    }),

  // Set ảnh đại diện
  setPrimary: (id: number | string) =>
    axiosInstance.put(API_CONFIG.ENDPOINTS.HOTEL_IMAGE_SET_PRIMARY(id)),

  
}


export default hotelImageApi