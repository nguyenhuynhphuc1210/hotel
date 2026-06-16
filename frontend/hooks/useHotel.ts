import { useQuery, useMutation, useQueryClient, useQueries  } from '@tanstack/react-query'
import hotelApi, { HotelRequest, HotelStatus } from '@/lib/api/hotel.api'
import toast from 'react-hot-toast'

const KEY = 'hotels'


export const useHotels = (
  page: number,
  size: number,
  keyword?: string,
  status?: HotelStatus
) => {
  return useQuery({
    queryKey: ['hotels', page, size, keyword, status],
    queryFn: async () => {
      const res = await hotelApi.getAll(page, size, keyword, status)
      return res.data
    },
    placeholderData: previousData => previousData,
  })
}

export const useHotelCountByStatus = (statuses: HotelStatus[]) => {
  return useQueries({
    queries: statuses.map(status => ({
      queryKey: ['hotels', 'count', status],
      queryFn: async () => {
        const res = await hotelApi.getAll(0, 1, undefined, status)
        return { status, total: res.data.totalElements }
      },
    })),
  })
}


export const useHotel = (id: number | string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: () => hotelApi.getById(id).then(r => r.data),
    enabled: !!id,
  })


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


export const useApproveHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => hotelApi.approve(id),
    onSuccess: () => {
      toast.success('Đã duyệt khách sạn!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}


export const useDisableHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      hotelApi.disable(id, reason),
    onSuccess: () => {
      toast.success('Đã vô hiệu hóa khách sạn!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export const useRejectHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      hotelApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối khách sạn!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export const useDeletedHotels = (page = 0, size = 10) =>
  useQuery({
    queryKey: [KEY, 'deleted', page, size],
    queryFn: () => hotelApi.getDeleted(page, size).then(r => r.data),
  })

export const useRestoreHotel = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => hotelApi.restore(id),
    onSuccess: () => {
      toast.success('Khôi phục khách sạn thành công!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Khôi phục thất bại!')
    },
  })
}