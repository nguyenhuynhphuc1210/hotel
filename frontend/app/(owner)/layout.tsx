'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useRef, ChangeEvent } from 'react' // Thêm useRef, ChangeEvent
import {
  LayoutDashboard, Hotel, BedDouble, CalendarDays,
  CalendarCheck, Star, Tag, LogOut, ChevronRight, ChevronDown,
  Building2, CreditCard, MessageSquare, Camera, Loader2, User as UserIcon // Thêm icons
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { OwnerHotelProvider, useOwnerHotel } from './owner-hotel-context'
import NotificationBell from '@/components/layout/NotificationBell'
import userApi from '@/lib/api/user.api' // Thêm api
import { useMutation } from '@tanstack/react-query' // Thêm mutation
import toast from 'react-hot-toast' // Thêm toast

const navItems = [
  { href: '/owner', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/owner/hotel', label: 'Khách sạn', icon: Hotel },
  { href: '/owner/hotels', label: 'Khách sạn của tôi', icon: Building2 },
  { href: '/owner/rooms', label: 'Loại phòng', icon: BedDouble },
  { href: '/owner/calendar', label: 'Lịch & Giá', icon: CalendarDays },
  { href: '/owner/bookings', label: 'Đặt phòng', icon: CalendarCheck },
  { href: '/owner/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/owner/reviews', label: 'Đánh giá', icon: Star },
  { href: '/owner/promotions', label: 'Khuyến mãi', icon: Tag },
  { href: '/owner/messages', label: 'Tin nhắn', icon: MessageSquare },
]

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth, setUser } = useAuthStore() // Lấy thêm setUser
  const fileInputRef = useRef<HTMLInputElement>(null) // Ref cho input file

  const handleLogout = () => {
    clearAuth()
    router.push('/admin/login')
  }

  // LOGIC UPLOAD AVATAR
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

  const { hotels, activeHotelId, setActiveHotelId, isLoading } = useOwnerHotel()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">🏨</div>
          <div>
            <div className="text-sm font-bold text-gray-900">Owner Portal</div>
            <div className="text-xs text-gray-400">Quản lý hệ thống</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-blue-400" />}
              </Link>
            )
          })}
        </nav>

        {/* User Section với chức năng Avatar */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 relative group">
            
            {/* AVATAR CONTAINER */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold overflow-hidden border border-gray-200">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) ?? <UserIcon size={20} />
                )}
              </div>
              
              {/* Nút upload nhỏ đè lên avatar khi hover */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
                className="absolute -bottom-1 -right-1 p-1 bg-white border border-gray-200 rounded-full shadow-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                {uploadAvatarMutation.isPending ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Camera size={10} />
                )}
              </button>
              
              {/* Input file ẩn */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">
                {user?.fullName ?? 'Owner'}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {user?.email ?? ''}
              </div>
            </div>
          </div>

          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={17} />Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Owner Portal</span>
            <ChevronRight size={14} />
            <span className="text-gray-700 font-medium">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Dashboard'}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-gray-400 font-medium uppercase tracking-wider">Khách sạn:</span>
            <div className="relative">
              <select
                value={activeHotelId ?? ''}
                onChange={(e) => setActiveHotelId(Number(e.target.value))}
                className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-blue-700 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[180px]"
              >
                {isLoading ? (
                  <option>Đang tải...</option>
                ) : hotels.length > 0 ? (
                  hotels.map(h => (
                    <option key={h.id} value={h.id}>{h.hotelName}</option>
                  ))
                ) : (
                  <option>Không có khách sạn</option>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />
            <NotificationBell />
            
            {/* Hiển thị avatar nhỏ ở header cho đồng bộ */}
            <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden border border-gray-200">
               {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-700 text-xs font-bold">
                    {user?.fullName?.charAt(0)}
                  </div>
                )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerHotelProvider>
      <LayoutContent>{children}</LayoutContent>
    </OwnerHotelProvider>
  )
}), { ssr: false })