'use client'

import React, { useRef, ChangeEvent } from 'react' // Thêm useRef, ChangeEvent
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Hotel, CalendarCheck, Users, LogOut, 
  ChevronRight, Sparkles, Star, Trash2, CreditCard,
  Camera, Loader2, User as UserIcon // Thêm icons
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import userApi from '@/lib/api/user.api' // Thêm api
import { useMutation } from '@tanstack/react-query' // Thêm mutation
import toast from 'react-hot-toast' // Thêm toast

const navItems = [
  { href: '/admin',          label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/admin/hotels',   label: 'Khách sạn',    icon: Hotel },
  { href: '/admin/bookings', label: 'Đặt phòng',    icon: CalendarCheck },
  { href: '/admin/payments', label: 'Thanh toán',   icon: CreditCard },
  { href: '/admin/users',    label: 'Người dùng',   icon: Users },
  { href: '/admin/amenities', label: 'Tiện ích', icon: Sparkles },
  { href: '/admin/reviews', label: 'Đánh giá', icon: Star },
  { href: '/admin/trash', label: 'Thùng rác', icon: Trash2 },
]

function AdminLayout({ children }: { children: React.ReactNode; params?: Promise<Record<string, string>> }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth, setUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">🏨</div>
          <div>
            <div className="text-sm font-bold text-gray-900">Vago Hotel</div>
            <div className="text-xs text-gray-400">Quản trị hệ thống</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-blue-400" />}
              </Link>
            )
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          {/* Avatar Section tương tự trang Owner */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold overflow-hidden border border-gray-200">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) ?? <UserIcon size={18} />
                )}
              </div>
              
              {/* Nút chọn ảnh nhỏ */}
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
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{user?.fullName ?? 'Admin'}</div>
              <div className="text-[10px] text-gray-400 truncate">{user?.email ?? ''}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>

      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Trang quản trị</span>
            <ChevronRight size={14} />
            <span className="text-gray-700 font-medium">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Dashboard'}
            </span>
          </div>

          {/* Hiển thị avatar nhỏ bên phải Topbar cho sang trọng */}
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-gray-900">{user?.fullName}</div>
                <div className="text-[10px] text-gray-400">Administrator</div>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden border border-gray-200 shadow-sm">
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

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}

export default AdminLayout