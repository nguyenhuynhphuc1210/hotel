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
      <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 min-h-[600px]">
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Chi tiết hồ sơ
            </h3>
            <p className="text-gray-500 text-sm mt-1">Quản lý thông tin cá nhân của bạn để bảo mật tài khoản</p>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm"
            >
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-gray-100 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>

              <button
                onClick={handleSaveProfile}
                disabled={
                  updateProfileMutation.isPending
                }
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-md shadow-blue-100"
              >
                {updateProfileMutation.isPending && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
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
              placeholder="Nhập họ và tên"
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
              placeholder="Nhập số điện thoại"
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
            <div className="relative">
              <select
                disabled={!isEditing}
                className="input-profile appearance-none cursor-pointer"
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
              {isEditing && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                   <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              )}
            </div>
          </InputGroup>

          <div className="md:col-span-2 mt-4">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
              Email (Không thể thay đổi)
            </label>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 text-sm font-medium flex items-center gap-3">
              <Mail size={18} className="text-gray-400" />
              {user.email}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input-profile {
          width: 100%;
          padding: 0.875rem 1rem;
          background-color: #fcfdfe;
          border: 1px solid #f1f5f9;
          border-radius: 0.75rem;
          font-size: 0.935rem;
          color: #1e293b;
          transition: all 0.2s ease;
          outline: none;
        }

        .input-profile:focus {
          background-color: white;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .input-profile:disabled {
          cursor: not-allowed;
          background-color: #f8fafc;
          color: #64748b;
          border-color: transparent;
        }
        
        .input-profile:hover:not(:disabled) {
            border-color: #cbd5e1;
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
    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-1">
      {label}
    </label>
    {children}
  </div>
)

export default dynamic(
  () => Promise.resolve(ProfilePage),
  { ssr: false }
)