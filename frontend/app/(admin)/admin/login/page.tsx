'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import authApi from '@/lib/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  email:    z.string().min(1, 'Không được để trống').email('Email không đúng định dạng'),
  password: z.string().min(1, 'Không được để trống'),
})
type Form = z.infer<typeof schema>

export default function AdminLoginPage() {
  const router  = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      setLoading(true)
      const res = await authApi.login(data)
      const { token, user } = res.data

      const role = user.roleName
      if (role !== 'ROLE_ADMIN' && role !== 'ROLE_HOTEL_OWNER') {
        toast.error('Tài khoản không có quyền truy cập trang quản lý')
        return
      }

      setAuth(token, user)
      toast.success(`Chào mừng, ${user.fullName}!`)

      if (role === 'ROLE_ADMIN')        router.push('/admin')
      else if (role === 'ROLE_HOTEL_OWNER') router.push('/owner')

    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-72 h-72 rounded-full bg-indigo-500 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Vago Management</h1>
          <p className="text-slate-400 text-sm mt-1">Cổng quản lý hệ thống</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Đăng nhập quản trị</h2>
          <p className="text-slate-400 text-xs mb-6">Chỉ dành cho Admin và Hotel Owner</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@example.com"
                autoComplete="username"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors mt-2 shadow-lg shadow-blue-600/20">
              {loading && <Loader2 size={16} className="animate-spin"/>}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Về trang khách hàng
            </a>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2026 Vago Hotel Management System
        </p>
      </div>
    </div>
  )
}