'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import authApi from '@/lib/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const loginSchema = z.object({
    email: z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
    const router = useRouter()
    const setAuth = useAuthStore((s) => s.setAuth)
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

    const onSubmit = async (data: LoginForm) => {
        try {
            setLoading(true)
            const res = await authApi.login(data)
            const { token, user } = res.data
            setAuth(token, user)
            toast.success(`Chào mừng, ${user.fullName}!`)
            router.push('/home')
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } }
            toast.error(error?.response?.data?.message || 'Email hoặc mật khẩu không đúng')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">

            {/* Logo */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F0FE] mb-4">
                    <span className="text-3xl">🏨</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vago Hotel</h1>
                <p className="text-sm text-gray-400 mt-1">Đặt phòng khách sạn tại TP.HCM</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_24px_rgba(0,0,0,0.06)] p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Đăng nhập</h2>
                <p className="text-sm text-gray-400 mb-7">Chào mừng trở lại! Vui lòng nhập thông tin.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                            {...register('email')}
                            type="email"
                            placeholder="id@email.com"
                            className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-900 placeholder:text-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all ${errors.email ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'}`}
                        />
                        {errors.email && (
                            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                            <a href="/forgot-password" className="text-xs text-[#1A56DB] hover:underline">Quên mật khẩu?</a>
                        </div>
                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPass ? 'text' : 'password'}
                                placeholder="••••••••"
                                className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-900 placeholder:text-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all pr-11 ${errors.password ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1648C0] active:scale-[0.99] disabled:opacity-60 transition-all mt-1 shadow-[0_2px_12px_rgba(26,86,219,0.3)]"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>

                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">hoặc</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500">
                    Chưa có tài khoản?{' '}
                    <a href="/register" className="text-[#1A56DB] font-semibold hover:underline">
                        Đăng ký ngay
                    </a>
                </p>
            </div>

            <p className="text-center text-xs text-gray-300 mt-8">
                © 2025 Vago Hotel. All rights reserved.
            </p>
        </div>
    )
}