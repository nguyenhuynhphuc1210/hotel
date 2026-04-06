'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    User, Package, Calendar, MapPin,
    ChevronRight, LogOut, Loader2, Mail,
    Phone, Save, X, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '@/store/authStore'
import bookingApi from '@/lib/api/booking.api'
import userApi from '@/lib/api/user.api'

import { BookingStatus } from '@/types/booking.types'
import { UserRequest, Gender } from '@/types/user.types'
import dynamic from 'next/dynamic'

// Định nghĩa kiểu cho lỗi API
interface ApiError {
    response?: {
        data?: {
            message?: string
        }
    }
}

type TabType = 'info' | 'bookings'

function ProfilePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()

    // Auth Store
    const { user, logout, isLoading: authLoading, setUser } = useAuthStore()

    // State
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'info')
    const [isEditing, setIsEditing] = useState(false)
    
    // Khởi tạo state form
    const [formData, setFormData] = useState<UserRequest>({
        email: '',
        fullName: '',
        password: '', 
        phone: '',
        dateOfBirth: '',
        gender: 'OTHER' as Gender,
        avatarUrl: '',
        roleId: 0
    })

    // --- Kích hoạt chế độ sửa và nạp dữ liệu ---
    const startEditing = () => {
        if (user) {
            setFormData({
                email: user.email,
                fullName: user.fullName,
                password: '', 
                phone: user.phone || '',
                dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
                gender: (user.gender as Gender) || ('OTHER' as Gender), // Fix lỗi gán string cho Gender
                avatarUrl: user.avatarUrl || '',
                roleId: user.roleId
            })
            setIsEditing(true)
        }
    }

    // 1. Fetch Lịch sử đặt phòng
    const { data: bookings, isLoading: bookingsLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: () => bookingApi.getMyBookings().then(res => res.data),
        enabled: !!user && activeTab === 'bookings'
    })

    // 2. Mutation cập nhật thông tin
    const updateMutation = useMutation({
        mutationFn: (data: UserRequest) => userApi.update(user!.id, data),
        onSuccess: (res) => {
            toast.success('Cập nhật thông tin thành công!')
            setIsEditing(false)
            if (setUser) setUser(res.data) 
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        },
        onError: (err: unknown) => { // Thay any bằng unknown
            const apiError = err as ApiError // Ép kiểu để truy cập message
            const msg = apiError.response?.data?.message || 'Cập nhật thất bại'
            toast.error(msg)
        }
    })

    const handleSave = () => {
        if (!formData.fullName.trim()) return toast.error('Họ tên không được để trống')
        updateMutation.mutate(formData)
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        )
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
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

    return (
        <div className="min-h-screen bg-[#f8fafc] py-10 font-sans">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-12 gap-8">

                    {/* SIDEBAR TRÁI */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md overflow-hidden">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-blue-500" />
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
                                <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <button
                                    onClick={() => { setActiveTab('info'); setIsEditing(false); }}
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
                                    <button onClick={() => { logout(); router.replace('/'); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-semibold text-sm">
                                        <LogOut size={20} /> Đăng xuất
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* NỘI DUNG PHẢI */}
                    <div className="col-span-12 lg:col-span-8">
                        {activeTab === 'info' && (
                            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h3>
                                    {!isEditing ? (
                                        <button 
                                            onClick={startEditing}
                                            className="px-5 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all"
                                        >
                                            Chỉnh sửa thông tin
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setIsEditing(false)}
                                                className="px-5 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all flex items-center gap-2"
                                            >
                                                <X size={14} /> Hủy
                                            </button>
                                            <button 
                                                onClick={handleSave}
                                                disabled={updateMutation.isPending}
                                                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                                            >
                                                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                Lưu thay đổi
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</label>
                                        {isEditing ? (
                                            <input 
                                                type="text"
                                                className="w-full p-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm transition-all outline-none"
                                                value={formData.fullName}
                                                onChange={e => setFormData({...formData, fullName: e.target.value})}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium text-sm">
                                                <User size={18} className="text-gray-400" /> {user.fullName}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email liên hệ</label>
                                        <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-2xl text-gray-400 font-medium text-sm cursor-not-allowed">
                                            <Mail size={18} /> {user.email}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số điện thoại</label>
                                        {isEditing ? (
                                            <input 
                                                type="text"
                                                className="w-full p-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm transition-all outline-none"
                                                value={formData.phone}
                                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium text-sm">
                                                <Phone size={18} className="text-gray-400" /> {user.phone || 'Chưa cập nhật'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày sinh</label>
                                        {isEditing ? (
                                            <input 
                                                type="date"
                                                className="w-full p-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm transition-all outline-none"
                                                value={formData.dateOfBirth}
                                                onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl text-gray-700 font-medium text-sm">
                                                <Calendar size={18} className="text-gray-400" /> 
                                                {user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Chưa cập nhật'}
                                            </div>
                                        )}
                                    </div>

                                    {isEditing && (
                                        <div className="col-span-1 md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đường dẫn ảnh đại diện (URL)</label>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="https://example.com/avatar.jpg"
                                                    className="w-full p-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm transition-all outline-none pl-12"
                                                    value={formData.avatarUrl}
                                                    onChange={e => setFormData({...formData, avatarUrl: e.target.value})}
                                                />
                                                <Camera className="absolute left-4 top-4 text-gray-400" size={18} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter">#{booking.bookingCode}</span>
                                                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${getStatusStyle(booking.status)}`}>{booking.status}</span>
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
                                                <div className="md:w-48 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5">
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400 font-medium">Tổng thanh toán</p>
                                                        <p className="text-xl font-black text-blue-600">{booking.totalAmount.toLocaleString('vi-VN')}₫</p>
                                                    </div>
                                                    <button onClick={() => router.push(`/booking/detail/${booking.id}`)} className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold transition-colors">Xem chi tiết</button>
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