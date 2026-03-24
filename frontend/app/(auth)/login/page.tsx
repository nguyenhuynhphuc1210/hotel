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

            // Lưu vào store + localStorage
            setAuth(token, user)

            toast.success(`Chào mừng, ${user.fullName}!`)

            // Redirect theo role
            const role = user.roleName
            if (role === 'ROLE_ADMIN') router.push('/admin')
            else if (role === 'ROLE_HOTEL_OWNER') router.push('/owner')
            else router.push('/')

        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } }
            const msg = error?.response?.data?.message || 'Email hoặc mật khẩu không đúng'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🏨</div>
                    <h1 className="text-2xl font-bold text-gray-900">Vago Hotel</h1>
                    <p className="text-sm text-gray-500 mt-1">Đặt phòng khách sạn tại TP.HCM</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Đăng nhập</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="example@email.com"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <input
                                    {...register('password')}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition mt-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>

                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        Chưa có tài khoản?{' '}
                        <a href="/register" className="text-blue-600 font-medium hover:underline">
                            Đăng ký ngay
                        </a>
                    </p>
                </div>

            </div>
        </div>
    )
}