'use client'

import React, { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api'
import { useMutation } from '@tanstack/react-query'
import {
  UpdateUserRequest,
  Gender,
} from '@/types/user.types'
import dynamic from 'next/dynamic'

interface ApiError {
  response?: { data?: { message?: string } | string }
}

interface InputGroupProps {
  label: string
  children: React.ReactNode
}

function ProfilePage() {
  const { user, setUser, isLoading: authLoading } =
    useAuthStore()

  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] =
    useState<UpdateUserRequest>({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth
        ? user.dateOfBirth.split('T')[0]
        : '',
      gender: (user?.gender as Gender) || 'OTHER',
    })

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) =>
      userApi.updateMyProfile(data),

    onSuccess: (res) => {
      toast.success('Cập nhật thành công!')
      setIsEditing(false)

      if (setUser) setUser(res.data)
    },

    onError: (err: ApiError) => {
      const msg =
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message ||
            'Lỗi cập nhật'

      toast.error(msg)
    },
  })

  const handleSaveProfile = () => {
    if (!formData.fullName.trim()) {
      return toast.error(
        'Họ tên không được để trống'
      )
    }

    updateProfileMutation.mutate(formData)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2
          className="animate-spin text-blue-600"
          size={40}
        />
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold">
            Chi tiết hồ sơ
          </h3>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800"
            >
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 bg-gray-100 rounded-xl text-xs font-bold hover:bg-gray-200"
              >
                Hủy
              </button>

              <button
                onClick={handleSaveProfile}
                disabled={
                  updateProfileMutation.isPending
                }
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {updateProfileMutation.isPending && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                Lưu thay đổi
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup label="Họ và tên">
            <input
              type="text"
              disabled={!isEditing}
              className="input-profile"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fullName: e.target.value,
                })
              }
            />
          </InputGroup>

          <InputGroup label="Số điện thoại">
            <input
              type="text"
              disabled={!isEditing}
              className="input-profile"
              value={formData.phone || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value,
                })
              }
            />
          </InputGroup>

          <InputGroup label="Ngày sinh">
            <input
              type="date"
              disabled={!isEditing}
              className="input-profile"
              value={formData.dateOfBirth || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dateOfBirth: e.target.value,
                })
              }
            />
          </InputGroup>

          <InputGroup label="Giới tính">
            <select
              disabled={!isEditing}
              className="input-profile appearance-none"
              value={formData.gender}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as Gender,
                })
              }
            >
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </InputGroup>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Email (Không thể thay đổi)
            </label>

            <div className="p-4 bg-gray-100 rounded-2xl text-gray-400 text-sm font-medium flex items-center gap-2">
              <Mail size={16} />
              {user.email}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input-profile {
          width: 100%;
          padding: 1rem;
          background-color: #f9fafb;
          border: 1px solid transparent;
          border-radius: 1rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          outline: none;
        }

        .input-profile:focus {
          background-color: white;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px #eff6ff;
        }

        .input-profile:disabled {
          cursor: not-allowed;
          color: #6b7280;
        }
      `}</style>
    </>
  )
}

const InputGroup = ({
  label,
  children,
}: InputGroupProps) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
      {label}
    </label>

    {children}
  </div>
)

export default dynamic(
  () => Promise.resolve(ProfilePage),
  { ssr: false }
)