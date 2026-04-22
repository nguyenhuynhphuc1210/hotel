'use client'

import React, { useState, useRef, ChangeEvent, FormEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    User, Package, ChevronRight, LogOut, Loader2, Mail,
    Save, Camera, Lock, Eye, EyeOff, MapPin, Heart, Star,
    Hotel, CalendarDays, X, Ban
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api'
import bookingApi from '@/lib/api/booking.api'
import favoriteApi from '@/lib/api/favorite.api'
import { UpdateUserRequest, ChangePasswordRequest, Gender } from '@/types/user.types'
import { BookingStatus } from '@/types/booking.types'
import dynamic from 'next/dynamic'
import { FavoriteResponse, FavoritePage } from '@/types/favorite.types'
import Pagination from '@/components/ui/Pagination'

interface ApiError {
    response?: { data?: { message?: string } | string }
}

type TabType = 'info' | 'bookings' | 'favorites' | 'security'

interface TabBtnProps {
    active: boolean
    icon: ReactNode
    label: string
    onClick: () => void
    badge?: number
}

interface InputGroupProps {
    label: string
    children: ReactNode
}

function ProfilePage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { user, logout, setUser, isLoading: authLoading } = useAuthStore()
    const queryClient = useQueryClient()

    const [activeTab, setActiveTab] = useState<TabType>('info')
    const [isEditing, setIsEditing] = useState(false)
    const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false })

    // Pagination state for bookings
    const [bookingPage, setBookingPage] = useState(0)
    const [bookingSize] = useState(10)

    // Cancel confirmation state
    const [cancellingId, setCancellingId] = useState<number | null>(null)
    const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null)

    const [formData, setFormData] = useState<UpdateUserRequest>({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        gender: (user?.gender as Gender) || 'OTHER',
    })

    const [pwdData, setPwdData] = useState<ChangePasswordRequest>({
        oldPassword: '', newPassword: '', confirmPassword: '',
    })

    const { data: bookingsPageData, isLoading: bookingsLoading } = useQuery({
        queryKey: ['my-bookings', bookingPage, bookingSize],
        queryFn: () => bookingApi.getMyBookings(bookingPage, bookingSize).then(r => r.data),
        enabled: !!user && activeTab === 'bookings',
    })

    const bookings = bookingsPageData?.content ?? []
    const totalPages = bookingsPageData?.totalPages ?? 0
    const totalElements = bookingsPageData?.totalElements ?? 0

    const { data: favoritesPage, isLoading: favLoading, refetch: refetchFavs } = useQuery({
        queryKey: ['my-favorites'],
        queryFn: () => favoriteApi.getMyFavorites(0, 20).then(r => r.data as FavoritePage),
        enabled: !!user && activeTab === 'favorites',
    })
    const favorites: FavoriteResponse[] = favoritesPage?.content ?? []

    const updateProfileMutation = useMutation({
        mutationFn: (data: UpdateUserRequest) => userApi.updateMyProfile(data),
        onSuccess: (res) => {
            toast.success('Cập nhật thành công!')
            setIsEditing(false)
            if (setUser) setUser(res.data)
        },
        onError: (err: ApiError) => {
            const msg = typeof err.response?.data === 'string' ? err.response.data : err.response?.data?.message || 'Lỗi cập nhật'
            toast.error(msg)
        },
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: (file: File) => userApi.uploadAvatar(file),
        onSuccess: async () => {
            toast.success('Cập nhật ảnh đại diện thành công!')
            try {
                const res = await userApi.getMyProfile()
                if (setUser) setUser(res.data)
            } catch { }
        },
        onError: () => toast.error('Upload ảnh thất bại'),
    })

    const changePwdMutation = useMutation({
        mutationFn: (data: ChangePasswordRequest) => userApi.changePassword(data),
        onSuccess: () => {
            toast.success('Đổi mật khẩu thành công!')
            setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' })
        },
        onError: (err: ApiError) => {
            const msg = typeof err.response?.data === 'string' ? err.response.data : err.response?.data?.message || 'Mật khẩu cũ không đúng'
            toast.error(msg)
        },
    })

    const cancelBookingMutation = useMutation({
        mutationFn: (id: number) => bookingApi.cancelBooking(id),
        onSuccess: () => {
            toast.success('Đã hủy đơn đặt phòng thành công!')
            setCancellingId(null)
            setConfirmCancelId(null)
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        },
        onError: (err: ApiError) => {
            const msg = typeof err.response?.data === 'string' ? err.response.data : err.response?.data?.message || 'Hủy đơn thất bại'
            toast.error(msg)
            setCancellingId(null)
        },
    })

    const handleCancelBooking = (id: number) => {
        setCancellingId(id)
        cancelBookingMutation.mutate(id)
        setConfirmCancelId(null)
    }

    const [removingId, setRemovingId] = useState<number | null>(null)
    const handleRemoveFavorite = async (hotelId: number) => {
        setRemovingId(hotelId)
        try {
            await favoriteApi.toggle(hotelId)
            toast.success('Đã xóa khỏi yêu thích!')
            refetchFavs()
        } catch {
            toast.error('Có lỗi xảy ra')
        } finally {
            setRemovingId(null)
        }
    }

    const handleSaveProfile = () => {
        if (!formData.fullName.trim()) return toast.error('Họ tên không được để trống')
        updateProfileMutation.mutate(formData)
    }

    const handleChangePassword = (e: FormEvent) => {
        e.preventDefault()
        if (pwdData.newPassword.length < 6) return toast.error('Mật khẩu mới phải ít nhất 6 ký tự')
        if (pwdData.newPassword !== pwdData.confirmPassword) return toast.error('Xác nhận mật khẩu không khớp')
        changePwdMutation.mutate(pwdData)
    }

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) uploadAvatarMutation.mutate(e.target.files[0])
    }

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const getStatusInfo = (status: BookingStatus) => {
        switch (status) {
            case 'CONFIRMED': return { label: 'Đã xác nhận', style: 'bg-emerald-100 text-emerald-700' }
            case 'PENDING': return { label: 'Chờ xử lý', style: 'bg-amber-100 text-amber-700' }
            case 'CANCELLED': return { label: 'Đã hủy', style: 'bg-red-100 text-red-700' }
            case 'COMPLETED': return { label: 'Đã hoàn thành', style: 'bg-blue-100 text-blue-700' }
            case 'CHECKED_IN': return { label: 'Đã nhận phòng', style: 'bg-purple-100 text-purple-700' }
            case 'NO_SHOW': return { label: 'Không đến', style: 'bg-gray-100 text-gray-700' }
            default: return { label: status, style: 'bg-gray-100 text-gray-700' }
        }
    }

    // Only PENDING and CONFIRMED can be cancelled by user
    const isCancellable = (status: BookingStatus) =>
        status === 'PENDING' || status === 'CONFIRMED'

    if (authLoading || !user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] py-10">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-12 gap-8">

                    {/* SIDEBAR */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="relative group">
                                    <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md overflow-hidden">
                                        {user.avatarUrl
                                            ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                            : <User size={48} className="text-blue-500" />}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadAvatarMutation.isPending}
                                        className="absolute bottom-4 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        {uploadAvatarMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{user.fullName}</h2>
                                <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <TabBtn active={activeTab === 'info'} icon={<User size={20} />} label="Thông tin cá nhân" onClick={() => setActiveTab('info')} />
                                <TabBtn
                                    active={activeTab === 'bookings'}
                                    icon={<Package size={20} />}
                                    label="Đơn đặt phòng"
                                    onClick={() => { setActiveTab('bookings'); setBookingPage(0) }}
                                    badge={totalElements || undefined}
                                />
                                <TabBtn active={activeTab === 'favorites'} icon={<Heart size={20} />} label="Khách sạn yêu thích" onClick={() => setActiveTab('favorites')} badge={favorites?.length || undefined} />
                                <TabBtn active={activeTab === 'security'} icon={<Lock size={20} />} label="Bảo mật & Mật khẩu" onClick={() => setActiveTab('security')} />

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <button onClick={() => { logout(); router.replace('/') }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-semibold text-sm">
                                        <LogOut size={20} /> Đăng xuất
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="col-span-12 lg:col-span-8">

                        {/* ── Tab Thông tin ── */}
                        {activeTab === 'info' && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-bold">Chi tiết hồ sơ</h3>
                                    {!isEditing
                                        ? <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800">Chỉnh sửa</button>
                                        : <div className="flex gap-2">
                                            <button onClick={() => setIsEditing(false)} className="px-5 py-2 bg-gray-100 rounded-xl text-xs font-bold hover:bg-gray-200">Hủy</button>
                                            <button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                                                {updateProfileMutation.isPending && <Loader2 size={14} className="animate-spin" />} Lưu thay đổi
                                            </button>
                                        </div>
                                    }
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup label="Họ và tên">
                                        <input type="text" disabled={!isEditing} className="input-profile" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                                    </InputGroup>
                                    <InputGroup label="Số điện thoại">
                                        <input type="text" disabled={!isEditing} className="input-profile" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </InputGroup>
                                    <InputGroup label="Ngày sinh">
                                        <input type="date" disabled={!isEditing} className="input-profile" value={formData.dateOfBirth || ''} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                                    </InputGroup>
                                    <InputGroup label="Giới tính">
                                        <select disabled={!isEditing} className="input-profile appearance-none" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}>
                                            <option value="MALE">Nam</option>
                                            <option value="FEMALE">Nữ</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                    </InputGroup>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email (Không thể thay đổi)</label>
                                        <div className="p-4 bg-gray-100 rounded-2xl text-gray-400 text-sm font-medium flex items-center gap-2">
                                            <Mail size={16} /> {user.email}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab Đơn đặt phòng ── */}
                        {activeTab === 'bookings' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold text-gray-900">Đơn đặt phòng của tôi</h3>
                                    {totalElements > 0 && (
                                        <span className="text-sm text-gray-400">{totalElements} đơn</span>
                                    )}
                                </div>

                                {bookingsLoading ? (
                                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>
                                ) : !bookings || bookings.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500 font-medium">Bạn chưa có đơn đặt phòng nào.</p>
                                        <button onClick={() => router.push('/')} className="mt-4 text-blue-600 font-bold text-sm">Khám phá ngay</button>
                                    </div>
                                ) : (
                                    <>
                                        {bookings.map((booking) => (
                                            <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <div className="p-5 flex flex-col md:flex-row gap-5">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">#{booking.bookingCode}</span>
                                                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${getStatusInfo(booking.status).style}`}>{getStatusInfo(booking.status).label}</span>
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
                                                        <div className="flex flex-col gap-2 w-full mt-4">
                                                            <button
                                                                onClick={() => router.push(`/booking/detail/${booking.id}`)}
                                                                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                Xem chi tiết
                                                            </button>

                                                            {/* Cancel button — only for PENDING / CONFIRMED */}
                                                            {isCancellable(booking.status) && (
                                                                confirmCancelId === booking.id ? (
                                                                    <div className="flex gap-1.5">
                                                                        <button
                                                                            onClick={() => setConfirmCancelId(null)}
                                                                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors"
                                                                        >
                                                                            Không
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelBooking(booking.id)}
                                                                            disabled={cancellingId === booking.id}
                                                                            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60 transition-colors"
                                                                        >
                                                                            {cancellingId === booking.id
                                                                                ? <Loader2 size={12} className="animate-spin" />
                                                                                : 'Xác nhận'}
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setConfirmCancelId(booking.id)}
                                                                        className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                                    >
                                                                        <Ban size={13} /> Hủy đơn
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Pagination */}
                                        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
                                            <Pagination
                                                currentPage={bookingPage}
                                                totalPages={totalPages}
                                                totalElements={totalElements}
                                                pageSize={bookingSize}
                                                onPageChange={(p) => setBookingPage(p)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Tab Yêu thích ── */}
                        {activeTab === 'favorites' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold text-gray-900">Khách sạn yêu thích</h3>
                                    {favorites.length > 0 && (
                                        <span className="text-sm text-gray-400">{favorites.length} khách sạn</span>
                                    )}
                                </div>

                                {favLoading ? (
                                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-red-400" /></div>
                                ) : favorites.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Heart size={32} className="text-red-300" />
                                        </div>
                                        <p className="text-gray-500 font-medium mb-1">Chưa có khách sạn yêu thích nào.</p>
                                        <p className="text-xs text-gray-400 mb-4">Nhấn vào nút ❤️ trên trang khách sạn để lưu lại.</p>
                                        <button onClick={() => router.push('/')} className="text-blue-600 font-bold text-sm">Khám phá khách sạn</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {favorites.map((fav: FavoriteResponse, index: number) => (
                                            <div
                                                key={fav.hotel.id || index}
                                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex"
                                            >
                                                <div
                                                    className="w-36 shrink-0 bg-gray-100 cursor-pointer overflow-hidden"
                                                    onClick={() => router.push(`/hotels/${fav.hotel.id}`)}
                                                >
                                                    {fav.hotel.thumbnailUrl ? (
                                                        <img src={fav.hotel.thumbnailUrl} alt={fav.hotel.hotelName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Hotel size={32} className="text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 p-5 flex flex-col justify-between">
                                                    <div>
                                                        <h4
                                                            className="font-bold text-gray-900 text-base mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                                                            onClick={() => router.push(`/hotels/${fav.hotel.id}`)}
                                                        >
                                                            {fav.hotel.hotelName}
                                                        </h4>
                                                        {fav.hotel.city && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                                                                <MapPin size={11} /> {fav.hotel.city}
                                                            </div>
                                                        )}
                                                        {fav.hotel.starRating && (
                                                            <div className="flex items-center gap-0.5">
                                                                {[...Array(Math.round(fav.hotel.starRating))].map((_, i) => (
                                                                    <Star
                                                                        key={`${fav.hotel.id}-star-${i}`}
                                                                        size={11}
                                                                        fill="#f59e0b"
                                                                        className="text-amber-400"
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-3">
                                                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                                            <CalendarDays size={11} />
                                                            Đã lưu {new Date(fav.createdAt).toLocaleDateString('vi-VN')}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => router.push(`/hotels/${fav.hotel.id}`)}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                                                            >
                                                                Xem khách sạn
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveFavorite(fav.hotel.id)}
                                                                disabled={removingId === fav.hotel.id}
                                                                className="p-1.5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                                                title="Xóa khỏi yêu thích"
                                                            >
                                                                {removingId === fav.hotel.id
                                                                    ? <Loader2 size={14} className="animate-spin" />
                                                                    : <X size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab Bảo mật ── */}
                        {activeTab === 'security' && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
                                <h3 className="text-xl font-bold mb-8">Đổi mật khẩu</h3>
                                <form onSubmit={handleChangePassword} className="max-w-md space-y-6">
                                    <PasswordField label="Mật khẩu hiện tại" value={pwdData.oldPassword} show={showPassword.old}
                                        onToggle={() => setShowPassword({ ...showPassword, old: !showPassword.old })}
                                        onChange={val => setPwdData({ ...pwdData, oldPassword: val })} />
                                    <PasswordField label="Mật khẩu mới" value={pwdData.newPassword} show={showPassword.new}
                                        onToggle={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                        onChange={val => setPwdData({ ...pwdData, newPassword: val })} />
                                    <PasswordField label="Xác nhận mật khẩu mới" value={pwdData.confirmPassword} show={showPassword.confirm}
                                        onToggle={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                        onChange={val => setPwdData({ ...pwdData, confirmPassword: val })} />
                                    <button type="submit" disabled={changePwdMutation.isPending}
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {changePwdMutation.isPending && <Loader2 size={18} className="animate-spin" />}
                                        Cập nhật mật khẩu mới
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .input-profile {
                    width: 100%; padding: 1rem;
                    background-color: #f9fafb; border: 1px solid transparent;
                    border-radius: 1rem; font-size: 0.875rem;
                    transition: all 0.2s; outline: none;
                }
                .input-profile:focus { background-color: white; border-color: #3b82f6; box-shadow: 0 0 0 4px #eff6ff; }
                .input-profile:disabled { cursor: not-allowed; color: #6b7280; }
            `}</style>
        </div>
    )
}

const TabBtn = ({ active, icon, label, onClick, badge }: TabBtnProps) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-50 text-gray-600'}`}>
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {badge !== undefined && badge > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{badge}</span>
            )}
            <ChevronRight size={16} />
        </div>
    </button>
)

const InputGroup = ({ label, children }: InputGroupProps) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {children}
    </div>
)

const PasswordField = ({ label, value, show, onToggle, onChange }: {
    label: string; value: string; show: boolean; onToggle: () => void; onChange: (v: string) => void
}) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
        <div className="relative">
            <input type={show ? 'text' : 'password'} required className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100" value={value} onChange={e => onChange(e.target.value)} />
            <button type="button" onClick={onToggle} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
)

export default dynamic(() => Promise.resolve(ProfilePage), { ssr: false })