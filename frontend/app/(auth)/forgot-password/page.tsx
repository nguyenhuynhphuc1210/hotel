'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, Mail, KeyRound, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import authApi from '@/lib/api/auth.api'
import toast from 'react-hot-toast'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP gồm 6 chữ số').regex(/^\d+$/, 'OTP chỉ gồm chữ số'),
})

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

type EmailForm    = z.infer<typeof emailSchema>
type OtpForm      = z.infer<typeof otpSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { icon: Mail,     label: 'Email' },
  { icon: KeyRound, label: 'OTP'   },
  { icon: Lock,     label: 'Mật khẩu' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const router  = useRouter()
  const [step,    setStep]    = useState<0 | 1 | 2>(0)
  const [loading, setLoading] = useState(false)
  const [email,   setEmail]   = useState('')
  const [otp,     setOtp]     = useState('')

  // ── Form step 0 ──
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) })

  // ── Form step 1 ──
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) })

  // ── Form step 2 ──
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  // ── Handlers ──

  const handleSendOtp = async (data: EmailForm) => {
    try {
      setLoading(true)
      await authApi.forgotPassword(data.email)
      setEmail(data.email)
      toast.success('OTP đã được gửi đến email của bạn')
      setStep(1)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Không tìm thấy email này')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (data: OtpForm) => {
    try {
      setLoading(true)
      await authApi.verifyOtp(email, data.otp)
      setOtp(data.otp)
      toast.success('OTP hợp lệ!')
      setStep(2)
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'OTP không đúng hoặc đã hết hạn')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (data: PasswordForm) => {
    try {
      setLoading(true)
      await authApi.resetPassword(email, otp, data.newPassword)
      toast.success('Đặt lại mật khẩu thành công!')
      router.push('/login')
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      setLoading(true)
      await authApi.forgotPassword(email)
      toast.success('Đã gửi lại OTP')
      otpForm.reset()
    } catch {
      toast.error('Không thể gửi lại OTP')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_24px_rgba(0,0,0,0.06)] p-8">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone   = i < step
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                  isDone   ? 'bg-green-500 text-white' :
                  isActive ? 'bg-[#1A56DB] text-white' :
                             'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? '✓' : <Icon size={14} />}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  isActive ? 'text-[#1A56DB]' : isDone ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Step 0: Email ── */}
        {step === 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Quên mật khẩu</h2>
            <p className="text-sm text-gray-400 mb-7">
              Nhập email tài khoản, chúng tôi sẽ gửi mã OTP để xác minh.
            </p>

            <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  {...emailForm.register('email')}
                  type="email"
                  placeholder="id@email.com"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all ${
                    emailForm.formState.errors.email ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
                  }`}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1648C0] disabled:opacity-60 transition-all shadow-[0_2px_12px_rgba(26,86,219,0.3)]"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 1: OTP ── */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Nhập mã OTP</h2>
            <p className="text-sm text-gray-400 mb-7">
              Mã OTP đã được gửi đến <span className="font-medium text-gray-700">{email}</span>.
              Có hiệu lực trong <span className="font-medium text-amber-600">5 phút</span>.
            </p>

            <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã OTP</label>
                <input
                  {...otpForm.register('otp')}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="······"
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-center tracking-[0.5em] text-lg font-semibold bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all ${
                    otpForm.formState.errors.otp ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
                  }`}
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1648C0] disabled:opacity-60 transition-all shadow-[0_2px_12px_rgba(26,86,219,0.3)]"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Đang xác minh...' : 'Xác minh OTP'}
              </button>
            </form>

            <div className="flex items-center justify-between mt-5">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={13} /> Đổi email
              </button>
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="text-xs text-[#1A56DB] hover:underline disabled:opacity-50"
              >
                Gửi lại OTP
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: New password ── */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Đặt mật khẩu mới</h2>
            <p className="text-sm text-gray-400 mb-7">
              Tạo mật khẩu mới cho tài khoản <span className="font-medium text-gray-700">{email}</span>.
            </p>

            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                <input
                  {...passwordForm.register('newPassword')}
                  type="password"
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all ${
                    passwordForm.formState.errors.newPassword ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
                  }`}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
                <input
                  {...passwordForm.register('confirmPassword')}
                  type="password"
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-transparent transition-all ${
                    passwordForm.formState.errors.confirmPassword ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
                  }`}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1648C0] disabled:opacity-60 transition-all shadow-[0_2px_12px_rgba(26,86,219,0.3)]"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          </>
        )}

        {/* Back to login */}
        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-gray-300 mt-8">© 2025 Vago Hotel. All rights reserved.</p>
    </div>
  )
}