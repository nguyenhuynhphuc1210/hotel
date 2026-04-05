import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import amenityApi, { hotelAmenityApi, roomTypeAmenityApi  } from '@/lib/api/amenity.api'
import { AmenityRequest, HotelAmenityRequest, RoomTypeAmenityRequest  } from '@/types/amenity.types'
import toast from 'react-hot-toast'

const KEY = 'amenities'
const HOTEL_AMENITY_KEY = 'hotel-amenities'
const ROOM_TYPE_AMENITY_KEY = 'room-type-amenities'
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

// ─── Room Type Amenity ──────────────────────────────────

export const useRoomTypeAmenities = (roomTypeId: number | string) =>
  useQuery({
    queryKey: [ROOM_TYPE_AMENITY_KEY, roomTypeId],
    queryFn: () => roomTypeAmenityApi.getByRoomType(roomTypeId).then(r => r.data),
    enabled: !!roomTypeId,
  })

export const useCreateRoomTypeAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RoomTypeAmenityRequest) => roomTypeAmenityApi.create(data),
    onSuccess: (_, vars) => {
      toast.success('Đã thêm tiện ích cho loại phòng!')
      qc.invalidateQueries({ queryKey: [ROOM_TYPE_AMENITY_KEY, vars.roomTypeId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Thêm thất bại!')
    },
  })
}

export const useUpdateRoomTypeAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RoomTypeAmenityRequest) => roomTypeAmenityApi.update(data),
    onSuccess: (_, vars) => {
      toast.success('Cập nhật tiện ích phòng thành công!')
      qc.invalidateQueries({ queryKey: [ROOM_TYPE_AMENITY_KEY, vars.roomTypeId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Cập nhật thất bại!')
    },
  })
}

export const useDeleteRoomTypeAmenity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roomTypeId, amenityId }: { roomTypeId: number; amenityId: number }) =>
      roomTypeAmenityApi.delete(roomTypeId, amenityId),
    onSuccess: (_, vars) => {
      toast.success('Đã xoá tiện ích khỏi loại phòng!')
      qc.invalidateQueries({ queryKey: [ROOM_TYPE_AMENITY_KEY, vars.roomTypeId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Xoá thất bại!')
    },
  })
}

