'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useLogout'
import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import dynamic from 'next/dynamic'

function Header() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const { logout } = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
            🏨
          </div>
          <span className="text-lg font-bold text-green-700">Vago</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/home" className="hover:text-green-600 transition-colors">Trang chủ</Link>
          <Link href="/hotels" className="hover:text-green-600 transition-colors">Khách sạn</Link>
        </nav>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {user.roleName === 'ROLE_ADMIN' && (
                <Link href="/admin" className="text-xs text-purple-600 font-medium hover:underline">
                  Admin Portal
                </Link>
              )}
              {user.roleName === 'ROLE_HOTEL_OWNER' && (
                <Link href="/owner" className="text-xs text-blue-600 font-medium hover:underline">
                  Owner Portal
                </Link>
              )}
              <Link
                href="/profile"
                className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full hover:bg-green-50 hover:ring-1 hover:ring-green-300 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold">
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                    : user.fullName.charAt(0).toUpperCase()
                  }
                </div>
                <span className="text-sm text-gray-700 font-medium">{user.fullName}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={15} />
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
                Đăng nhập
              </Link>
              <Link href="/register" className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Đăng ký
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          <Link href="/home" className="block py-2 text-sm text-gray-700 hover:text-green-600">Trang chủ</Link>
          <Link href="/hotels" className="block py-2 text-sm text-gray-700 hover:text-green-600">Khách sạn</Link>
          {isAuthenticated && (
            <Link href="/profile" className="block py-2 text-sm text-gray-700 hover:text-green-600">
              Tài khoản của tôi
            </Link>
          )}
          {isAuthenticated ? (
            <button onClick={() => logout()} className="block py-2 text-sm text-red-600 w-full text-left">
              Đăng xuất
            </button>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center py-2 border border-gray-200 rounded-lg text-sm">Đăng nhập</Link>
              <Link href="/register" className="flex-1 text-center py-2 bg-green-600 text-white rounded-lg text-sm">Đăng ký</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default dynamic(() => Promise.resolve(Header), { ssr: false })