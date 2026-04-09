'use client'

import React, { useState, useRef, ChangeEvent, FormEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    User, Package, ChevronRight, LogOut, Loader2, Mail,
    Phone, Save, X, Camera, Lock, Eye, EyeOff, MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api'
import bookingApi from '@/lib/api/booking.api'
import { UpdateUserRequest, ChangePasswordRequest, Gender, UserResponse } from '@/types/user.types'
import { BookingStatus } from '@/types/booking.types'
import dynamic from 'next/dynamic'

// --- INTERFACES ---

interface ApiError {
    response?: {
        data?: {
            message?: string
        } | string
    }
}

type TabType = 'info' | 'bookings' | 'security'

interface TabBtnProps {
    active: boolean
    icon: ReactNode
    label: string
    onClick: () => void
}

interface InputGroupProps {
    label: string
    children: ReactNode
}

function ProfilePage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { user, logout, setUser, isLoading: authLoading } = useAuthStore()
    const [activeTab, setActiveTab] = useState<TabType>('info')
    const [isEditing, setIsEditing] = useState(false)
    const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false })

    // State cho Form Update Profile
    const [formData, setFormData] = useState<UpdateUserRequest>({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        gender: (user?.gender as Gender) || 'OTHER'
    })

    // State cho Đổi mật khẩu
    const [pwdData, setPwdData] = useState<ChangePasswordRequest>({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    // --- QUERIES ---

    const { data: bookings, isLoading: bookingsLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: () => bookingApi.getMyBookings().then(res => res.data),
        enabled: !!user && activeTab === 'bookings'
    })

    // --- MUTATIONS ---

    const updateProfileMutation = useMutation({
        mutationFn: (data: UpdateUserRequest) => userApi.updateMyProfile(data),
        onSuccess: (res) => {
            toast.success('Cập nhật thông tin thành công!')
            setIsEditing(false)
            if (setUser) setUser(res.data)
        },
        onError: (err: ApiError) => {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : err.response?.data?.message || 'Lỗi cập nhật'
            toast.error(msg)
        }
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: (file: File) => userApi.uploadAvatar(file),
        onSuccess: async () => {
            toast.success('Cập nhật ảnh đại diện thành công!');

            // CÁCH TỐT NHẤT: Gọi API lấy lại thông tin user mới nhất
            try {
                const res = await userApi.getMyProfile();
                if (setUser) setUser(res.data); // Cập nhật lại toàn bộ object từ server trả về
            } catch (error) {
                console.error("Lỗi khi đồng bộ profile:", error);
            }
        },
        onError: () => toast.error('Upload ảnh thất bại')
    });

    const changePwdMutation = useMutation({
        mutationFn: (data: ChangePasswordRequest) => userApi.changePassword(data),
        onSuccess: () => {
            toast.success('Đổi mật khẩu thành công!')
            setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' })
        },
        onError: (err: ApiError) => {
            const msg = typeof err.response?.data === 'string'
                ? err.response.data
                : err.response?.data?.message || 'Mật khẩu cũ không đúng'
            toast.error(msg)
        }
    })

    // --- HANDLERS ---

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
        if (e.target.files && e.target.files[0]) {
            uploadAvatarMutation.mutate(e.target.files[0])
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
    }

    const getStatusInfo = (status: BookingStatus) => {
        switch (status) {
            case 'CONFIRMED': return { label: 'Đã xác nhận', style: 'bg-emerald-100 text-emerald-700' }
            case 'PENDING': return { label: 'Chờ xử lý', style: 'bg-amber-100 text-amber-700' }
            case 'CANCELLED': return { label: 'Đã hủy', style: 'bg-red-100 text-red-700' }
            case 'COMPLETED': return { label: 'Đã hoàn thành', style: 'bg-blue-100 text-blue-700' }
            default: return { label: status, style: 'bg-gray-100 text-gray-700' }
        }
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        )
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
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={48} className="text-blue-500" />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadAvatarMutation.isPending}
                                        className="absolute bottom-4 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all disabled:bg-gray-400"
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
                                <TabBtn active={activeTab === 'bookings'} icon={<Package size={20} />} label="Đơn đặt phòng" onClick={() => setActiveTab('bookings')} />
                                <TabBtn active={activeTab === 'security'} icon={<Lock size={20} />} label="Bảo mật & Mật khẩu" onClick={() => setActiveTab('security')} />

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <button onClick={() => { logout(); router.replace('/'); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-semibold text-sm">
                                        <LogOut size={20} /> Đăng xuất
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="col-span-12 lg:col-span-8">

                        {activeTab === 'info' && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-bold">Chi tiết hồ sơ</h3>
                                    {!isEditing ? (
                                        <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all">Chỉnh sửa</button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditing(false)} className="px-5 py-2 bg-gray-100 rounded-xl text-xs font-bold hover:bg-gray-200">Hủy</button>
                                            <button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                                                {updateProfileMutation.isPending && <Loader2 size={14} className="animate-spin" />} Lưu thay đổi
                                            </button>
                                        </div>
                                    )}
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email liên hệ (Không thể thay đổi)</label>
                                        <div className="p-4 bg-gray-100 rounded-2xl text-gray-400 text-sm font-medium flex items-center gap-2">
                                            <Mail size={16} /> {user.email}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50 animate-in fade-in slide-in-from-bottom-4">
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

                                    <button
                                        type="submit"
                                        disabled={changePwdMutation.isPending}
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {changePwdMutation.isPending && <Loader2 size={18} className="animate-spin" />}
                                        Cập nhật mật khẩu mới
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'bookings' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Đơn đặt phòng của tôi</h3>
                                {bookingsLoading ? (
                                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>
                                ) : !bookings || bookings.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500 font-medium">Bạn chưa có đơn đặt phòng nào.</p>
                                        <button onClick={() => router.push('/')} className="mt-4 text-blue-600 font-bold text-sm">Khám phá ngay</button>
                                    </div>
                                ) : (
                                    bookings.map((booking) => (
                                        <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <div className="p-5 flex flex-col md:flex-row gap-5">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter">#{booking.bookingCode}</span>
                                                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${getStatusInfo(booking.status).style}`}>
                                                            {getStatusInfo(booking.status).label}
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

            <style jsx>{`
                .input-profile {
                    width: 100%;
                    padding: 1rem;
                    background-color: #f9fafb;
                    border: 1px solid transparent;
                    border-radius: 1rem;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    outline: none;
                }
                .input-profile:focus {
                    background-color: white;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px #eff6ff;
                }
                .input-profile:disabled {
                    cursor: not-allowed;
                    color: #6b7280;
                }
            `}</style>
        </div>
    )
}

// --- HELPER COMPONENTS (STRICT TYPING) ---

const TabBtn = ({ active, icon, label, onClick }: TabBtnProps) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-50 text-gray-600'}`}
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-sm">{label}</span>
        </div>
        <ChevronRight size={16} />
    </button>
)

const InputGroup = ({ label, children }: InputGroupProps) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {children}
    </div>
)

const PasswordField = ({ label, value, show, onToggle, onChange }: {
    label: string, value: string, show: boolean, onToggle: () => void, onChange: (v: string) => void
}) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                required
                className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
            <button type="button" onClick={onToggle} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
)

export default dynamic(() => Promise.resolve(ProfilePage), { ssr: false })