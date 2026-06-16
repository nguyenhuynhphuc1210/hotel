import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import userApi from '@/lib/api/user.api'
import { UserRequest } from '@/types/user.types'
import toast from 'react-hot-toast'

const KEY = 'users'


export const useUsers = (
  page = 0,
  size = 10,
  keyword = '',
  role = ''
) =>
  useQuery({
    queryKey: [KEY, page, size, keyword, role],

    queryFn: () =>
      userApi
        .getAll(page, size, keyword, role)
        .then(r => r.data),
  })


export const useUser = (id: number | string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: () => userApi.getById(id).then(r => r.data),
    enabled: !!id,
  })


export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UserRequest) => userApi.create(data),
    onSuccess: () => {
      toast.success('Tạo người dùng thành công!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Tạo thất bại!')
    },
  })
}


export const useUpdateUser = (id: number | string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UserRequest) => userApi.update(id, data),
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


export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => userApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xoá người dùng!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Xoá thất bại!')
    },
  })
}


export const useDisableUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => userApi.disable(id),
    onSuccess: () => {
      toast.success('Đã khoá tài khoản!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Khoá thất bại!')
    },
  })
}


export const useEnableUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => userApi.enable(id),
    onSuccess: () => {
      toast.success('Đã mở khoá tài khoản!')
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Mở khoá thất bại!')
    },
  })
}