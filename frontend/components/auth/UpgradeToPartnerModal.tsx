'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { AuthResponse } from '@/types/auth.types'

interface UpgradeToPartnerModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UpgradeToPartnerModal({ isOpen, onClose }: UpgradeToPartnerModalProps) {
  const { user, setAuth, isAuthenticated } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const isAlreadyOwner = user?.roleName === 'ROLE_HOTEL_OWNER'
  const isAdmin = user?.roleName === 'ROLE_ADMIN'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại liên hệ.')
      return
    }
    if (!agreed) {
      setError('Bạn cần đồng ý với điều khoản đối tác trước khi tiếp tục.')
      return
    }

    setLoading(true)
    try {
      const res = await axiosInstance.post<AuthResponse>(
        `${API_CONFIG.ENDPOINTS.USERS}/upgrade-to-partner`,
        { phone }
      )
      const { token, user: updatedUser } = res.data
      setAuth(token, updatedUser)
      setSuccess(true)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setError(
        axiosErr?.response?.data?.message ||
        'Đã có lỗi xảy ra. Vui lòng thử lại sau.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPhone('')
    setAgreed(false)
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header gradient banner */}
        <div
          className="relative px-8 pt-10 pb-8 text-white"
          style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)' }}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
          >
            ✕
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4">
            🏨
          </div>
          <h2 className="text-2xl font-bold mb-1">Trở thành Đối tác</h2>
          <p className="text-green-100 text-sm leading-relaxed">
            Đăng ký làm chủ khách sạn trên Vago và tiếp cận hàng ngàn khách hàng mỗi ngày.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Success state */}
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                ✅
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Đăng ký thành công!</h3>
              <p className="text-gray-500 text-sm mb-6">
                Tài khoản của bạn đã được nâng cấp lên <strong>Đối tác Hotel Owner</strong>. Bạn có thể bắt đầu đăng khách sạn ngay bây giờ.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
              >
                Bắt đầu quản lý khách sạn →
              </button>
            </div>
          ) : isAlreadyOwner ? (
            /* Already owner */
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🌟</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Bạn đã là Đối tác!</h3>
              <p className="text-gray-500 text-sm mb-5">
                Tài khoản của bạn đã có quyền Hotel Owner. Hãy vào trang quản lý để đăng khách sạn.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : !isAuthenticated ? (
            /* Not logged in */
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🔐</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Vui lòng đăng nhập</h3>
              <p className="text-gray-500 text-sm mb-5">
                Bạn cần có tài khoản Vago trước khi đăng ký trở thành đối tác.
              </p>
              <div className="flex gap-3">
                <a
                  href="/login"
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-center transition-colors"
                >
                  Đăng nhập
                </a>
                <a
                  href="/register"
                  className="flex-1 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-center transition-colors"
                >
                  Tạo tài khoản
                </a>
              </div>
            </div>
          ) : isAdmin ? (
            /* Admin can't upgrade */
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tài khoản Admin</h3>
              <p className="text-gray-500 text-sm mb-5">
                Tài khoản quản trị viên không cần đăng ký đối tác.
              </p>
              <button onClick={handleClose} className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors">
                Đóng
              </button>
            </div>
          ) : (
            /* Normal upgrade form */
            <>
              {/* Benefits */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: '📊', label: 'Quản lý đặt phòng' },
                  { icon: '💰', label: 'Thu nhập ổn định' },
                  { icon: '🌍', label: 'Tiếp cận rộng' },
                ].map((b) => (
                  <div key={b.label} className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{b.icon}</div>
                    <p className="text-xs text-green-800 font-medium leading-tight">{b.label}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email tài khoản
                  </label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-sm cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none text-sm transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1">Số điện thoại dùng để khách hàng và Vago liên hệ với bạn.</p>
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4 h-4 accent-green-600 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Tôi đồng ý với{' '}
                    <a href="#" className="text-green-600 hover:underline font-medium">Điều khoản Đối tác</a>
                    {' '}và{' '}
                    <a href="#" className="text-green-600 hover:underline font-medium">Chính sách sử dụng</a>
                    {' '}của Vago Hotel.
                  </span>
                </label>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                    <span className="shrink-0">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    'Đăng ký ngay'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}