'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, RefreshCw, Home } from 'lucide-react'

export default function PaymentFailedPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const bookingCode = searchParams.get('bookingCode') || ''

    return (
        <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
                
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                        <XCircle size={44} className="text-red-500" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Thanh toán thất bại
                </h1>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Giao dịch của bạn không thể hoàn tất. Đơn đặt phòng đã bị hủy và phòng đã được giải phóng.
                </p>

                {/* Booking code nếu có */}
                {bookingCode && (
                    <div className="bg-gray-50 rounded-2xl px-5 py-3 mb-6 inline-block">
                        <p className="text-xs text-gray-400 mb-0.5">Mã đặt phòng</p>
                        <p className="font-bold text-gray-700 tracking-wide">{bookingCode}</p>
                    </div>
                )}

                {/* Lý do thường gặp */}
                <div className="bg-red-50 rounded-2xl p-4 mb-7 text-left space-y-2">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Nguyên nhân thường gặp</p>
                    {[
                        'Giao dịch bị hủy bởi người dùng',
                        'Số dư tài khoản không đủ',
                        'Thẻ/tài khoản bị từ chối',
                        'Hết thời gian thanh toán',
                    ].map((reason, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-red-500">
                            <div className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                            {reason}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                    >
                        <RefreshCw size={16} /> Đặt phòng lại
                    </button>

                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <Home size={16} /> Về trang chủ
                    </button>
                </div>

                <p className="text-[11px] text-gray-400 mt-6 leading-relaxed">
                    Nếu bạn đã bị trừ tiền, vui lòng liên hệ{' '}
                    <span className="text-blue-500 cursor-pointer font-medium">hỗ trợ khách hàng</span>{' '}
                    để được hoàn tiền trong 3–5 ngày làm việc.
                </p>
            </div>
        </div>
    )
}