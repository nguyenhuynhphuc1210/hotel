import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import amenityApi, { hotelAmenityApi } from '@/lib/api/amenity.api'
import { AmenityRequest, HotelAmenityRequest } from '@/types/amenity.types'
import toast from 'react-hot-toast'

const KEY = 'amenities'
const HOTEL_AMENITY_KEY = 'hotel-amenities'

// ─── Amenity ───────────────────────────────────────────

export const useAmenities = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: () => amenityApi.getAll().then(r => r.data),
  })

export const useCreateAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AmenityRequest) => amenityApi.create(data),
    onSuccess: () => {
      toast.success('Tạo tiện ích thành công!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Tạo thất bại!')
    },
  })
}

export const useUpdateAmenity = (id: number | string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AmenityRequest) => amenityApi.update(id, data),
    onSuccess: () => {
      toast.success('Cập nhật thành công!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Cập nhật thất bại!')
    },
  })
}

export const useDeleteAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => amenityApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá tiện ích!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Xoá thất bại!')
    },
  })
}

// ─── Hotel Amenity ──────────────────────────────────────

export const useHotelAmenities = (hotelId: number | string) =>
  useQuery({
    queryKey: [HOTEL_AMENITY_KEY, hotelId],
    queryFn: () => hotelAmenityApi.getByHotel(hotelId).then(r => r.data),
    enabled: !!hotelId,
  })

export const useCreateHotelAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HotelAmenityRequest) => hotelAmenityApi.create(data),
    onSuccess: (_, vars) => {
      toast.success('Đã thêm tiện ích cho khách sạn!')
      qc.invalidateQueries({ queryKey: [HOTEL_AMENITY_KEY, vars.hotelId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Thêm thất bại!')
    },
  })
}

export const useUpdateHotelAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HotelAmenityRequest) => hotelAmenityApi.update(data),
    onSuccess: (_, vars) => {
      toast.success('Cập nhật tiện ích thành công!')
      qc.invalidateQueries({ queryKey: [HOTEL_AMENITY_KEY, vars.hotelId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Cập nhật thất bại!')
    },
  })
}

export const useDeleteHotelAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ hotelId, amenityId }: { hotelId: number; amenityId: number }) =>
      hotelAmenityApi.delete(hotelId, amenityId),
    onSuccess: (_, vars) => {
      toast.success('Đã xoá tiện ích!')
      qc.invalidateQueries({ queryKey: [HOTEL_AMENITY_KEY, vars.hotelId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Xoá thất bại!')
    },
  })
}