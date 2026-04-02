'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    User, Package, Calendar, MapPin,
    ChevronRight, LogOut, Loader2, Mail,
    Phone, CreditCard, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '@/store/authStore'
import bookingApi from '@/lib/api/booking.api'

import { BookingStatus } from '@/types/booking.types'
import { UserResponse } from '@/types/user.types'
import dynamic from 'next/dynamic'

type TabType = 'info' | 'bookings'

function ProfilePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()

    // Auth Store
    const { user, logout, isLoading: authLoading } = useAuthStore()

    // State
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'info')

    // 1. Kiểm tra đăng nhập (Guard)
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error('Vui lòng đăng nhập để xem thông tin')
            router.push(`/login?redirect=/profile?tab=${activeTab}`)
        }
    }, [user, authLoading, router, activeTab])

    // 2. Fetch Lịch sử đặt phòng
    const { data: bookings, isLoading: bookingsLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: () => bookingApi.getMyBookings().then(res => res.data),
        enabled: !!user && activeTab === 'bookings'
    })

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        )
    }

    const getStatusStyle = (status: BookingStatus) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700'
            case 'PENDING': return 'bg-amber-100 text-amber-700'
            case 'CANCELLED': return 'bg-red-100 text-red-700'
            case 'COMPLETED': return 'bg-blue-100 text-blue-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] py-10 font-sans">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-12 gap-8">

                    {/* SIDEBAR TRÁI */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-blue-500" />
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
                                <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === 'info' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-50 text-gray-600'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <User size={20} />
                                        <span className="font-semibold text-sm">Thông tin cá nhân</span>
                                    </div>
                                    <ChevronRight size={16} />
                                </button>

                                <button
                                    onClick={() => setActiveTab('bookings')}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === 'bookings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-50 text-gray-600'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Package size={20} />
                                        <span className="font-semibold text-sm">Đơn đặt phòng của tôi</span>
                                    </div>
                                    <ChevronRight size={16} />
                                </button>

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            logout();
                                            router.replace('/');
                                        }}
                                        className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-semibold text-sm"
                                    >
                                        <LogOut size={20} />
                                        Đăng xuất
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* NỘI DUNG PHẢI */}
                    <div className="col-span-12 lg:col-span-8">

                        {/* TAB 1: THÔNG TIN CÁ NHÂN */}
                        {activeTab === 'info' && (
                            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Thông tin cá nhân</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ và tên</label>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium">
                                            <User size={18} className="text-gray-400" /> {user.fullName}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email liên hệ</label>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium">
                                            <Mail size={18} className="text-gray-400" /> {user.email}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số điện thoại</label>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium">
                                            <Phone size={18} className="text-gray-400" /> {user.phone || 'Chưa cập nhật'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ngày sinh</label>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium">
                                            <Calendar size={18} className="text-gray-400" /> {user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Chưa cập nhật'}
                                        </div>
                                    </div>
                                </div>
                                <button className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all">
                                    Chỉnh sửa thông tin
                                </button>
                            </div>
                        )}

                        {/* TAB 2: LỊCH SỬ ĐẶT PHÒNG */}
                        {activeTab === 'bookings' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Đơn đặt phòng của tôi</h3>

                                {bookingsLoading ? (
                                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>
                                ) : bookings?.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500 font-medium">Bạn chưa có đơn đặt phòng nào.</p>
                                        <button onClick={() => router.push('/')} className="mt-4 text-blue-600 font-bold text-sm">Khám phá ngay</button>
                                    </div>
                                ) : (
                                    bookings?.map((booking) => (
                                        <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <div className="p-5 flex flex-col md:flex-row gap-5">
                                                {/* Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter">
                                                            #{booking.bookingCode}
                                                        </span>
                                                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${getStatusStyle(booking.status)}`}>
                                                            {booking.status}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 text-lg mb-1">{booking.hotelName}</h4>
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4">
                                                        <MapPin size={12} /> {booking.hotelAddress}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Nhận phòng</p>
                                                            <p className="text-sm font-bold text-gray-700">{formatDate(booking.checkInDate)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Trả phòng</p>
                                                            <p className="text-sm font-bold text-gray-700">{formatDate(booking.checkOutDate)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Price & Action */}
                                                <div className="md:w-48 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5">
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400 font-medium">Tổng thanh toán</p>
                                                        <p className="text-xl font-black text-blue-600">{booking.totalAmount.toLocaleString('vi-VN')}₫</p>
                                                    </div>
                                                    <button
                                                        onClick={() => router.push(`/booking/detail/${booking.id}`)}
                                                        className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold transition-colors"
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default dynamic(() => Promise.resolve(ProfilePage), { ssr: false })