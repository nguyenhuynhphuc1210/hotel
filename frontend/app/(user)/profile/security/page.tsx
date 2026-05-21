'use client'

import React, { FormEvent, useState } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation } from '@tanstack/react-query'

import userApi from '@/lib/api/user.api'
import { ChangePasswordRequest } from '@/types/user.types'

interface ApiError {
  response?: { data?: { message?: string } | string }
}

export default function SecurityPage() {
  const [showPassword, setShowPassword] =
    useState({
      old: false,
      new: false,
      confirm: false,
    })

  const [pwdData, setPwdData] =
    useState<ChangePasswordRequest>({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    })

  const changePwdMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      userApi.changePassword(data),

    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công!')

      setPwdData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    },

    onError: (err: ApiError) => {
      const msg =
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message ||
            'Mật khẩu cũ không đúng'

      toast.error(msg)
    },
  })

  const handleChangePassword = (
    e: FormEvent
  ) => {
    e.preventDefault()

    if (pwdData.newPassword.length < 6) {
      return toast.error(
        'Mật khẩu mới phải ít nhất 6 ký tự'
      )
    }

    if (
      pwdData.newPassword !==
      pwdData.confirmPassword
    ) {
      return toast.error(
        'Xác nhận mật khẩu không khớp'
      )
    }

    changePwdMutation.mutate(pwdData)
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
      <h3 className="text-xl font-bold mb-8">
        Đổi mật khẩu
      </h3>

      <form
        onSubmit={handleChangePassword}
        className="max-w-md space-y-6"
      >
        <PasswordField
          label="Mật khẩu hiện tại"
          value={pwdData.oldPassword}
          show={showPassword.old}
          onToggle={() =>
            setShowPassword({
              ...showPassword,
              old: !showPassword.old,
            })
          }
          onChange={(val) =>
            setPwdData({
              ...pwdData,
              oldPassword: val,
            })
          }
        />

        <PasswordField
          label="Mật khẩu mới"
          value={pwdData.newPassword}
          show={showPassword.new}
          onToggle={() =>
            setShowPassword({
              ...showPassword,
              new: !showPassword.new,
            })
          }
          onChange={(val) =>
            setPwdData({
              ...pwdData,
              newPassword: val,
            })
          }
        />

        <PasswordField
          label="Xác nhận mật khẩu mới"
          value={pwdData.confirmPassword}
          show={showPassword.confirm}
          onToggle={() =>
            setShowPassword({
              ...showPassword,
              confirm: !showPassword.confirm,
            })
          }
          onChange={(val) =>
            setPwdData({
              ...pwdData,
              confirmPassword: val,
            })
          }
        />

        <button
          type="submit"
          disabled={changePwdMutation.isPending}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {changePwdMutation.isPending && (
            <Loader2
              size={18}
              className="animate-spin"
            />
          )}

          Cập nhật mật khẩu mới
        </button>
      </form>
    </div>
  )
}

const PasswordField = ({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (v: string) => void
}) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">
      {label}
    </label>

    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
      >
        {show ? (
          <EyeOff size={18} />
        ) : (
          <Eye size={18} />
        )}
      </button>
    </div>
  </div>
)