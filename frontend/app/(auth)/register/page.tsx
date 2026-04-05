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
    phone: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

const inputBase =
    'w-full py-3 border rounded-xl text-sm text-gray-900 placeholder:text-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all'

const inputError = 'border-red-400 ring-1 ring-red-300'
const inputNormal = 'border-gray-200'

export default function RegisterPage() {
    const router = useRouter()
    const [showPass, setShowPass] = useState(false)
    const [showConfirmPass, setShowConfirmPass] = useState(false)
    const [loading, setLoading] = useState(false)

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
            gender: 'MALE',
        },
    })

    const onSubmit = async (data: RegisterForm) => {
        try {
            setLoading(true)
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

    const FieldError = ({ msg }: { msg?: string }) =>
        msg ? (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {msg}
            </p>
        ) : null

    return (
        <div className="w-full max-w-md mx-auto">

            {/* Logo */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F0FE] mb-4">
                    <span className="text-3xl">🏨</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vago Hotel</h1>
                <p className="text-sm text-gray-400 mt-1">Tạo tài khoản mới để đặt phòng</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_24px_rgba(0,0,0,0.06)] p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Đăng ký</h2>
                <p className="text-sm text-gray-400 mb-7">Điền thông tin để tạo tài khoản miễn phí.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                {...register('fullName')}
                                placeholder="Nguyễn Văn A"
                                className={`${inputBase} pl-10 pr-4 ${errors.fullName ? inputError : inputNormal}`}
                            />
                        </div>
                        <FieldError msg={errors.fullName?.message} />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="id@email.com"
                                className={`${inputBase} pl-10 pr-4 ${errors.email ? inputError : inputNormal}`}
                            />
                        </div>
                        <FieldError msg={errors.email?.message} />
                    </div>

                    {/* Phone + Gender row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Điện thoại</label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input
                                    {...register('phone')}
                                    placeholder="0912345678"
                                    className={`${inputBase} pl-10 pr-4 ${errors.phone ? inputError : inputNormal}`}
                                />
                            </div>
                            <FieldError msg={errors.phone?.message} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới tính</label>
                            <select
                                {...register('gender')}
                                className={`${inputBase} px-4 ${errors.gender ? inputError : inputNormal} appearance-none`}
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                {...register('password')}
                                type={showPass ? 'text' : 'password'}
                                placeholder="Tối thiểu 6 ký tự"
                                className={`${inputBase} pl-10 pr-11 ${errors.password ? inputError : inputNormal}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                        <FieldError msg={errors.password?.message} />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                {...register('confirmPassword')}
                                type={showConfirmPass ? 'text' : 'password'}
                                placeholder="Nhập lại mật khẩu"
                                className={`${inputBase} pl-10 pr-11 ${errors.confirmPassword ? inputError : inputNormal}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                        <FieldError msg={errors.confirmPassword?.message} />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1648C0] active:scale-[0.99] disabled:opacity-60 transition-all mt-1 shadow-[0_2px_12px_rgba(26,86,219,0.3)]"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </button>

                </form>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Đã có tài khoản?{' '}
                    <a href="/login" className="text-[#1A56DB] font-semibold hover:underline">
                        Đăng nhập ngay
                    </a>
                </p>
            </div>

            <p className="text-center text-xs text-gray-300 mt-8">
                © 2025 Vago Hotel. All rights reserved.
            </p>
        </div>
    )
}