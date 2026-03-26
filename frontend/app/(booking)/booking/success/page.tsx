'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function BookingSuccessPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const bookingId = searchParams.get('bookingId')

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-emerald-600" size={36} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Đặt phòng thành công!</h1>
                <p className="text-gray-500 text-sm mb-6">
                    Mã đặt phòng của bạn: <span className="font-bold text-blue-600">#{bookingId}</span>
                </p>
                <div className="flex gap-3">
                    <button onClick={() => router.push('/profile/bookings')}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                        Xem đơn của tôi
                    </button>
                    <button onClick={() => router.push('/')}
                        className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50">
                        Về trang chủ
                    </button>
                </div>
            </div>
        </div>
    )
}