import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import hotelApi, { HotelRequest } from '@/lib/api/hotel.api'
import toast from 'react-hot-toast'

const KEY = 'hotels'

// Lấy tất cả khách sạn
export const useHotels = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

// Lấy 1 khách sạn
export const useHotel = (id: number | string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: () => hotelApi.getById(id).then(r => r.data),
    enabled: !!id,
  })

// Tạo khách sạn
export const useCreateHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HotelRequest) => hotelApi.create(data),
    onSuccess: () => {
      toast.success('Tạo khách sạn thành công!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Tạo thất bại!')
    },
  })
}

// Cập nhật khách sạn
export const useUpdateHotel = (id: number | string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HotelRequest) => hotelApi.update(id, data),
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

// Xoá khách sạn
export const useDeleteHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => hotelApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá khách sạn!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Xoá thất bại!')
    },
  })
}

// Duyệt khách sạn
export const useApproveHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => hotelApi.approve(id),
    onSuccess: () => {
      toast.success('Đã duyệt khách sạn!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Duyệt thất bại!')
    },
  })
}

// Vô hiệu hoá khách sạn
export const useDisableHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => hotelApi.disable(id),
    onSuccess: () => {
      toast.success('Đã vô hiệu hoá khách sạn!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Thất bại!')
    },
  })
}