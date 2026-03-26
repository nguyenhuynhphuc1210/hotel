'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, User, Mail, Lock, Phone } from 'lucide-react'
import authApi from '@/lib/api/auth.api'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

const registerSchema = z.object({
    fullName: z.string().min(1, 'Họ tên không được để trống'),
    email: z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    // Sử dụng .catch('') hoặc xử lý chuỗi trống để tránh undefined
    phone: z.string().optional(),
    // Ép kiểu cứng enum để không bị dính undefined
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>

// Interface cho lỗi từ Backend (tránh dùng any)
interface ApiErrorResponse {
    message: string
}

export default function RegisterPage() {
    const router = useRouter()
    const [showPass, setShowPass] = useState(false)
    const [showConfirmPass, setShowConfirmPass] = useState(false)
    const [loading, setLoading] = useState(false)

    // Đảm bảo cung cấp ĐẦY ĐỦ defaultValues cho các field
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            gender: 'MALE', // Giá trị mặc định khớp với Enum
        }
    })

    // Sử dụng RegisterForm cho data, tránh lỗi SubmitHandler
    const onSubmit = async (data: RegisterForm) => {
        try {
            setLoading(true)
            // Backend nhận RegisterRequest (không có confirmPassword)
            const { confirmPassword, ...registerData } = data

            await authApi.register(registerData)

            toast.success('Đăng ký tài khoản thành công!')
            router.push('/login')
        } catch (err) {
            const error = err as AxiosError<{ message?: string }>
            toast.error(error.response?.data?.message || 'Đăng ký thất bại')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🏨</div>
                    <h1 className="text-2xl font-bold text-gray-900">Vago Hotel</h1>
                    <p className="text-sm text-gray-500 mt-1">Tạo tài khoản mới để đặt phòng</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Đăng ký</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    {...register('fullName')}
                                    placeholder="Nguyễn Văn A"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    {...register('email')}
                                    type="email"
                                    placeholder="example@email.com"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại (Tùy chọn)</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    {...register('phone')}
                                    placeholder="0912345678"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                        </div>

                        {/* Gender selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới tính</label>
                            <select
                                {...register('gender')}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    {...register('password')}
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    {...register('confirmPassword')}
                                    type={showConfirmPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition mt-4"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                        </button>

                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        Đã có tài khoản?{' '}
                        <a href="/login" className="text-blue-600 font-medium hover:underline">
                            Đăng nhập ngay
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}