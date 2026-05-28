'use client'

import React, { useRef, ChangeEvent, ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
    User,
    Package,
    Heart,
    Lock,
    LogOut,
    Camera,
    Loader2,
    ChevronRight,
    MessageSquare
} from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import userApi from '@/lib/api/user.api'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export default function ProfileLayout({
    children,
}: {
    children: ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { user, logout, setUser, isLoading } = useAuthStore()

    // Biến để kiểm tra đã render ở Client chưa nhằm tránh lỗi Hydration
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true)
    }, [])

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

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            uploadAvatarMutation.mutate(e.target.files[0])
        }
    }

    // Nếu chưa Mounted (ở Server) hoặc đang Loading dữ liệu
    if (!isMounted || isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] py-2 md:py-6"> {/* Giảm padding trên dưới xuống tối thiểu */}
            <div className="max-w-[1400px] mx-auto px-2 md:px-6"> {/* Agoda dùng container rất rộng (1400px) */}
                <div className="grid grid-cols-12 gap-4 md:gap-6">

                    {/* SIDEBAR - Chiếm 3/12 cột, Sticky để luôn thấy menu khi cuộn */}
                    <div className="col-span-12 lg:col-span-3">
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm sticky top-20">
                            
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="relative group">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-50 rounded-full flex items-center justify-center mb-3 border-4 border-white shadow-sm overflow-hidden">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={40} className="text-blue-500" />
                                        )}
                                    </div>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadAvatarMutation.isPending}
                                        className="absolute bottom-1 right-0 p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all"
                                    >
                                        {uploadAvatarMutation.isPending ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Camera size={12} />
                                        )}
                                    </button>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={onFileChange}
                                    />
                                </div>

                                <h2 className="text-base md:text-lg font-bold text-gray-900 truncate w-full px-2">
                                    {user.fullName}
                                </h2>
                                <p className="text-gray-400 text-[11px] md:text-xs truncate w-full px-2">
                                    {user.email}
                                </p>
                            </div>

                            <nav className="space-y-0.5 md:space-y-1">
                                <SidebarBtn
                                    active={pathname === '/profile'}
                                    icon={<User size={18} />}
                                    label="Thông tin cá nhân"
                                    onClick={() => router.push('/profile')}
                                />
                                <SidebarBtn
                                    active={pathname === '/profile/message'}
                                    icon={<MessageSquare size={18} />}
                                    label="Tin nhắn từ cơ sở"
                                    onClick={() => router.push('/profile/message')}
                                />
                                <SidebarBtn
                                    active={pathname === '/profile/booking'}
                                    icon={<Package size={18} />}
                                    label="Đơn đặt phòng"
                                    onClick={() => router.push('/profile/booking')}
                                />
                                <SidebarBtn
                                    active={pathname === '/profile/favorite'}
                                    icon={<Heart size={18} />}
                                    label="Khách sạn yêu thích"
                                    onClick={() => router.push('/profile/favorite')}
                                />                                
                                <SidebarBtn
                                    active={pathname === '/profile/security'}
                                    icon={<Lock size={18} />}
                                    label="Bảo mật & Mật khẩu"
                                    onClick={() => router.push('/profile/security')}
                                />
                                <div className="pt-2 mt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            logout()
                                            router.replace('/')
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg text-red-500 hover:bg-red-50 transition-all font-semibold text-xs"
                                    >
                                        <LogOut size={16} />
                                        Đăng xuất
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* CONTENT - Chiếm 9/12 cột, mở rộng tối đa sang hai bên */}
                    <div className="col-span-12 lg:col-span-9">
                        {children}
                    </div>

                </div>
            </div>
        </div>
    )
}

const SidebarBtn = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${active
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-gray-50 text-gray-600'
            }`}
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-xs md:text-sm">{label}</span>
        </div>
        <ChevronRight size={14} className={active ? 'opacity-100' : 'opacity-20'} />
    </button>
)