'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Hotel, CalendarCheck, Users, LogOut, ChevronRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin',          label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/admin/hotels',   label: 'Khách sạn',    icon: Hotel },
  { href: '/admin/bookings', label: 'Đặt phòng',    icon: CalendarCheck },
  { href: '/admin/users',    label: 'Người dùng',   icon: Users },
  { href: '/admin/amenities', label: 'Tiện ích', icon: Sparkles },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
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
          {/* Avatar + tên */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold shrink-0">
              {user?.fullName?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.fullName ?? 'Admin'}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email ?? ''}</div>
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Trang quản trị</span>
            <ChevronRight size={14} />
            <span className="text-gray-700 font-medium">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Dashboard'}
            </span>
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