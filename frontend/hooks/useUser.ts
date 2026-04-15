import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import userApi from '@/lib/api/user.api'
import { UserRequest } from '@/types/user.types'
import toast from 'react-hot-toast'

const KEY = 'users'

// Lấy tất cả users
export const useUsers = (page = 0, size = 10) =>
  useQuery({
    queryKey: [KEY, page, size],
    queryFn: () => userApi.getAll(page, size).then(r => r.data),
  })

// Lấy 1 user
export const useUser = (id: number | string) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: () => userApi.getById(id).then(r => r.data),
    enabled: !!id,
  })

// Tạo user
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

// Cập nhật user
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

// Xoá user
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

// Khoá user
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

// Mở khoá user
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