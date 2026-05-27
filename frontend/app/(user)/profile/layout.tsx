'use client'

import React, { useRef, ChangeEvent, ReactNode } from 'react'
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

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2
                    className="animate-spin text-blue-600"
                    size={40}
                />
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
                                            <img
                                                src={user.avatarUrl}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={48} className="text-blue-500" />
                                        )}
                                    </div>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadAvatarMutation.isPending}
                                        className="absolute bottom-4 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        {uploadAvatarMutation.isPending ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Camera size={16} />
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

                                <h2 className="text-xl font-bold text-gray-900">
                                    {user.fullName}
                                </h2>

                                <p className="text-gray-400 text-sm">
                                    {user.email}
                                </p>
                            </div>

                            <nav className="space-y-2">

                                <SidebarBtn
                                    active={pathname === '/profile'}
                                    icon={<User size={20} />}
                                    label="Thông tin cá nhân"
                                    onClick={() => router.push('/profile')}
                                />

                                <SidebarBtn
                                    active={pathname === '/profile/message'}
                                    icon={<MessageSquare size={20} />}
                                    label="Tin nhắn từ cơ sở lưu trú"
                                    onClick={() => router.push('/profile/message')}
                                />

                                <SidebarBtn
                                    active={pathname === '/profile/booking'}
                                    icon={<Package size={20} />}
                                    label="Đơn đặt phòng"
                                    onClick={() => router.push('/profile/booking')}
                                />

                                <SidebarBtn
                                    active={pathname === '/profile/favorite'}
                                    icon={<Heart size={20} />}
                                    label="Khách sạn yêu thích"
                                    onClick={() => router.push('/profile/favorite')}
                                />                                

                                <SidebarBtn
                                    active={pathname === '/profile/security'}
                                    icon={<Lock size={20} />}
                                    label="Bảo mật & Mật khẩu"
                                    onClick={() => router.push('/profile/security')}
                                />

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => {
                                            logout()
                                            router.replace('/')
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

                    {/* CONTENT */}
                    <div className="col-span-12 lg:col-span-8">
                        {children}
                    </div>

                </div>
            </div>
        </div>
    )
}

const SidebarBtn = ({
    active,
    icon,
    label,
    onClick,
}: {
    active: boolean
    icon: React.ReactNode
    label: string
    onClick: () => void
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'hover:bg-gray-50 text-gray-600'
            }`}
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-sm">
                {label}
            </span>
        </div>

        <ChevronRight size={16} />
    </button>
)